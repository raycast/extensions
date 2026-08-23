/**
 * The package-icon system: rows read a resolved icon, and a background pass
 * fills them in as they arrive.
 *
 * The icon cache directory IS the store. `rust/winget-com` writes each icon
 * there under the package's id the moment it resolves it — plus an empty
 * `.none` marker for packages it looked at and found nothing for, and a
 * `.backed.png` companion for the icons that need one in a dark theme — and
 * this hook watches the directory, so an icon shows up as soon as it exists
 * rather than when the batch it belonged to finishes. That is also why there
 * is no separate index of icons to keep in step: the files are the truth, and
 * clearing the directory clears everything.
 */

import { mkdirSync, readdirSync, rmSync, watch } from "node:fs";
import { join } from "node:path";

import { useEffect, useState } from "react";

import { environment, Icon, Image } from "@raycast/api";

import { supportPath } from "../core/paths";

/**
 * Rows per call. Big enough that one call streams for a while — the resolver
 * publishes each icon as it finishes and works from the top down — but small
 * enough that a search typed while it runs waits for the current call rather
 * than a hundred rows nobody is looking at any more.
 */
const BATCH_SIZE = 24;
/** How long the row set must hold still before it is worth resolving. */
const SETTLE_MS = 250;
/** Coalesces the burst of file events a batch produces. */
const WATCH_SETTLE_MS = 100;

/** Package ids reach the filesystem as names; `publish` in Rust encodes to match. */
function fileStem(id: string): string {
  return Array.from(new TextEncoder().encode(id))
    .map((byte) => {
      const char = String.fromCharCode(byte);
      return /[A-Za-z0-9._-]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

/** Stems present in the cache directory, refreshed when it changes. */
let cached: Set<string> | null = null;

function iconDirectory(): string {
  return supportPath("iconCache");
}

function scanCache(): Set<string> {
  try {
    return new Set(readdirSync(iconDirectory()));
  } catch {
    // Not created until the first icon resolves.
    return new Set();
  }
}

function cachedIcons(): Set<string> {
  cached ??= scanCache();
  return cached;
}

/** The row icon for a package, or a neutral placeholder. */
function packageIcon(id: string): Image.ImageLike {
  const stem = fileStem(id);
  if (!cachedIcons().has(`${stem}.png`)) {
    return Icon.Box;
  }
  // Icons that would disappear against a dark window — a dark glyph on
  // transparency, which every package that names GitHub as its site ends up
  // with — have a light-backed copy beside them. The theme is read as the row
  // is drawn, so a theme change shows up on the next repaint.
  const backed = `${stem}.backed.png`;
  const name = environment.appearance === "dark" && cachedIcons().has(backed) ? backed : `${stem}.png`;
  // Handed over as a file URL: a Windows path is not recognized as absolute
  // (that check is a leading "/"), so it would be looked for in the
  // extension's assets folder and never found.
  const path = join(iconDirectory(), name)
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.replace(/[^A-Za-z0-9._\-~:]/g, (char) => encodeURIComponent(char)))
    .join("/");
  return { source: `file:///${path}`, fallback: Icon.Box, mask: Image.Mask.RoundedRectangle };
}

/** Ids already requested in this worker, so a repaint cannot re-request them. */
const requested = new Set<string>();
/**
 * How many times one package may be looked up here. A resolver call can come
 * back having resolved nothing for a package — its manifest is a network read
 * that can fail — and those deserve another go rather than staying blank for
 * as long as the view lives. Bounded, so a package that never resolves does
 * not become a loop.
 */
const MAX_ATTEMPTS = 2;
const attempts = new Map<string, number>();
/**
 * Cleared once the resolver itself cannot be loaded — a missing or unbuildable
 * binary, which will not fix itself while this worker lives. A failed CALL is
 * different: winget's catalog refuses connections while its source updates,
 * and those rows deserve another try.
 */
let resolverAvailable = true;
/**
 * Only ever one resolver at a time. Two of them do not go twice as fast:
 * winget's server slows down under concurrency (the same 40 packages took
 * 7.9s with 16 requests in flight and 13.2s with 32), so a second run started
 * by a new search would drag out the one already working — and the rows the
 * person is looking at now are in the newer one.
 */
let running = false;

function usePackageIcons(ids: string[], paused: boolean): void {
  const [tick, repaint] = useState(0);

  // Repaint whenever an icon appears on disk, whichever call produced it.
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    try {
      // The directory is created by the resolver, which on a first run has not
      // run yet — and this effect never re-runs, so without creating it here
      // the very run that most needs watching would go unwatched.
      mkdirSync(iconDirectory(), { recursive: true });
      const watcher = watch(iconDirectory(), () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          cached = scanCache();
          repaint((tick) => tick + 1);
        }, WATCH_SETTLE_MS);
      });
      // An unhandled 'error' event would take the whole view down with it, and
      // Windows raises one when the watched directory is removed — which Clean
      // Index does, from this very view.
      watcher.on("error", () => watcher.close());
      return () => {
        clearTimeout(timer);
        watcher.close();
      };
    } catch {
      // Without a watcher the run's own repaint still refreshes the view.
      return;
    }
  }, []);

  // Anything with a file either way has been looked at already.
  const wanted = resolverAvailable
    ? ids.filter((id) => {
        const files = cachedIcons();
        const stem = fileStem(id);
        return !files.has(`${stem}.png`) && !files.has(`${stem}.none`) && !requested.has(id);
      })
    : [];
  const batchKey = wanted.slice(0, BATCH_SIZE).join(",");

  useEffect(() => {
    if (!batchKey || running || paused) {
      // Already running: that run ends with a repaint, which brings us back
      // here with whatever rows are on screen by then. Paused: an operation
      // holds the lock, and nothing else in this extension competes with one
      // — icons least of all, since the resolver and the install would be
      // asking the same winget server at the same time.
      return;
    }
    const batch = wanted.slice(0, BATCH_SIZE);

    // Typing changes the rows on every keystroke; resolve one settled list
    // rather than every intermediate one.
    const timer = setTimeout(() => {
      for (const id of batch) {
        requested.add(id);
      }
      running = true;
      void (async () => {
        try {
          const { package_icons: resolveIcons } = await import("rust:../../rust/winget-com");
          try {
            // Waited on to the end rather than given a deadline here. The call
            // cannot be cancelled — neither the COM query nor the manifest
            // reads behind it can be — so giving up on it would not stop it,
            // it would only let a second resolver start alongside the first
            // and compete with it for the same server. Every request it makes
            // is bounded on its side.
            await resolveIcons(batch, iconDirectory());
          } catch {
            // This run failed; the rows stay eligible for the next.
            for (const id of batch) {
              requested.delete(id);
            }
          }
        } catch {
          resolverAvailable = false;
        }
        running = false;
        cached = scanCache();
        for (const id of batch) {
          const stem = fileStem(id);
          if (cached.has(`${stem}.png`) || cached.has(`${stem}.none`)) {
            continue;
          }
          const tried = (attempts.get(id) ?? 0) + 1;
          attempts.set(id, tried);
          if (tried < MAX_ATTEMPTS) {
            requested.delete(id);
          }
        }
        // Also the signal to pick up the next rows, current ones included.
        repaint((counter) => counter + 1);
      })();
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [batchKey, tick, paused]);
}

/**
 * Throw away every resolved icon, including the "nothing found" markers. The
 * directory itself stays, so the watcher installed by open views survives.
 */
function clearIconCache(): void {
  try {
    for (const entry of readdirSync(iconDirectory())) {
      rmSync(join(iconDirectory(), entry), { recursive: true, force: true, maxRetries: 3 });
    }
  } catch {
    // Nothing to clear, or a file the resolver still holds: the entries that
    // did go are gone, and the rest are overwritten as they resolve again.
  }
  cached = null;
  requested.clear();
  attempts.clear();
  resolverAvailable = true;
}

export { clearIconCache, packageIcon, usePackageIcons };
