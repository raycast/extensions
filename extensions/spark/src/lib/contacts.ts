import { Cache, environment, Image } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { useCallback, useEffect, useRef, useState } from "react";
import { avatarSVG } from "./avatar";
import { imageFile } from "./files";
import { IS_WINDOWS, SparkError, sparkJSON } from "./spark";
import { Address, ContactResult } from "./types";

const execFileAsync = promisify(execFile);

/// A contact plus a small copy of its photo, ready to embed in a row icon.
export type CachedContact = ContactResult & { photo?: string };

// `spark contact` answers one address at a time (~50 ms each), so contacts are
// fetched a few at a time. The last known contact is kept, so photos and
// settings show straight away, and every screen reloads it in the background.
const thumbnails = new Cache({ namespace: "avatar-thumbnails" });
const contactCache = new Cache({ namespace: "contacts-v3" });
const CONCURRENCY = 4;
/// How long arriving contacts are collected before the rows are redrawn.
const FLUSH_DELAY_MS = 150;

function key(email: string): string {
  return email.trim().toLowerCase();
}

/// Contacts loaded during this session (a command's lifetime), backed by the
/// persistent cache from earlier sessions.
const session = new Map<string, CachedContact | null>();

function remembered(email: string): CachedContact | null | undefined {
  if (session.has(email)) return session.get(email);
  const raw = contactCache.get(email);
  if (raw === undefined) return undefined;
  try {
    const contact = JSON.parse(raw) as CachedContact | null;
    // The photo is kept once, in the thumbnail cache.
    const photo = contact?.avatar_path ? cachedThumbnail(contact.avatar_path) : undefined;
    const restored = contact && { ...contact, photo };
    session.set(email, restored);
    return restored;
  } catch {
    return undefined;
  }
}

function remember(email: string, contact: CachedContact | null): void {
  session.set(email, contact);
  contactCache.set(email, JSON.stringify(contact && { ...contact, photo: undefined }));
}

const inFlight = new Map<string, Promise<CachedContact | null>>();
const queue: (() => void)[] = [];
let running = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      running++;
      task()
        .then(resolve, reject)
        .finally(() => {
          running--;
          queue.shift()?.();
        });
    };
    if (running < CONCURRENCY) start();
    else queue.push(start);
  });
}

/// Loads a contact from Spark and caches it. Resolves null for an address
/// Spark has no contact for; rejects when Spark can't be asked at all.
export function fetchContact(email: string): Promise<CachedContact | null> {
  const id = key(email);
  const pending = inFlight.get(id);
  if (pending) return pending;
  const request = schedule(async () => {
    try {
      const result = await sparkJSON<ContactResult>(["contact", email]);
      const contact: CachedContact = { ...result, photo: result.avatar_path && (await thumbnail(result.avatar_path)) };
      remember(id, contact);
      return contact;
    } catch (error) {
      // "no contact found" is an answer; anything else (not running, too old)
      // is not.
      if (error instanceof SparkError && error.kind === "command") {
        remember(id, null);
        return null;
      }
      throw error;
    }
  }).finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
}

/// Contacts for `emails`: the last known ones straight away, reloaded from
/// Spark once each time the screen opens. Undefined when never loaded, null when
/// Spark has none.
export function useContacts(emails: string[]): {
  contacts: Record<string, CachedContact | null | undefined>;
  refresh: (email: string) => Promise<void>;
} {
  const unique = [...new Set(emails.filter(Boolean).map(key))];
  const signature = unique.join("\n");
  const [contacts, setContacts] = useState<Record<string, CachedContact | null | undefined>>(() =>
    Object.fromEntries(unique.map((email) => [email, remembered(email)])),
  );
  // Addresses this screen has asked Spark about. Each is reloaded once per
  // screen, so loading the next page looks up only its new senders.
  const requested = useRef(new Set<string>());
  // Lookups outlive a change of addresses (they're still wanted when the next
  // page arrives), so only leaving the screen drops their results.
  const mounted = useRef(true);
  // Contacts arrive one by one, a few milliseconds apart. Each update redraws
  // the rows it changes, so they're applied together.
  const arrived = useRef<Record<string, CachedContact | null>>({});
  const flushTimer = useRef<NodeJS.Timeout>(undefined);

  const flush = () => {
    flushTimer.current = undefined;
    if (!mounted.current) return;
    const batch = arrived.current;
    arrived.current = {};
    setContacts((current) => {
      // A reload that brings back what's shown keeps the shown object, so the
      // rows holding it don't redraw.
      const changed = Object.entries(batch).filter(
        ([email, contact]) => JSON.stringify(current[email]) !== JSON.stringify(contact),
      );
      return changed.length ? { ...current, ...Object.fromEntries(changed) } : current;
    });
  };
  const scheduleFlush = () => {
    flushTimer.current ??= setTimeout(flush, FLUSH_DELAY_MS);
  };

  useEffect(() => {
    // React's StrictMode, which Raycast applies to a locally installed
    // extension, unmounts and remounts once on open: the flag must come back.
    mounted.current = true;
    if (Object.keys(arrived.current).length) scheduleFlush();
    return () => {
      mounted.current = false;
      clearTimeout(flushTimer.current);
      flushTimer.current = undefined;
    };
  }, []);

  useEffect(() => {
    const fresh = unique.filter((email) => !requested.current.has(email));
    // Show what's known for the new addresses (a next page) right away.
    setContacts((current) => {
      const missing = fresh.filter((email) => current[email] === undefined);
      if (!missing.length) return current;
      return { ...current, ...Object.fromEntries(missing.map((email) => [email, remembered(email)])) };
    });
    for (const email of fresh) {
      requested.current.add(email);
      fetchContact(email)
        .then((contact) => {
          arrived.current[email] = contact;
          scheduleFlush();
        })
        // Without Spark there's nothing to show beyond initials; a later
        // render may try again.
        .catch(() => requested.current.delete(email));
    }
  }, [signature]);

  // Stable, so memoized rows that receive it don't redraw.
  const refresh = useCallback(async (email: string) => {
    inFlight.delete(key(email));
    try {
      const contact = await fetchContact(email);
      setContacts((current) => ({ ...current, [key(email)]: contact }));
    } catch {
      // Keep what's shown.
    }
  }, []);

  return { contacts, refresh };
}

export function contactFor(
  contacts: Record<string, CachedContact | null | undefined>,
  email: string | undefined,
): CachedContact | null | undefined {
  return email ? contacts[key(email)] : undefined;
}

/// Spark caches photos at full size (some are 1000 px), too big to embed in
/// every row, so on macOS a 96 px PNG copy is made with `sips`. The copy is kept
/// per photo file (path, size, and modification time), so a changed photo is
/// scaled again. Undefined when the photo can't be read or scaled.
/// The thumbnail already made for this photo file, if any - synchronous, for
/// showing a cached contact on the first render.
function cachedThumbnail(path: string): string | undefined {
  try {
    const info = statSync(path);
    return thumbnails.get(`${path}:${info.size}:${info.mtimeMs}`);
  } catch {
    return undefined;
  }
}

async function thumbnail(path: string): Promise<string | undefined> {
  let id: string;
  try {
    const info = await stat(path);
    id = `${path}:${info.size}:${info.mtimeMs}`;
  } catch {
    return undefined;
  }
  const cached = thumbnails.get(id);
  if (cached) return cached;
  const photo = await scale(path);
  if (photo) thumbnails.set(id, photo);
  return photo;
}

/// Windows has no `sips`, so a photo is used as Spark cached it when it's
/// small enough to embed; a larger one leaves the initials.
const MAX_UNSCALED_PHOTO_BYTES = 200 * 1024;

async function scale(path: string): Promise<string | undefined> {
  if (IS_WINDOWS) {
    try {
      const bytes = await readFile(path);
      return bytes.length <= MAX_UNSCALED_PHOTO_BYTES ? bytes.toString("base64") : undefined;
    } catch {
      return undefined;
    }
  }
  const dir = join(environment.supportPath, "avatars");
  const out = join(dir, `${createHash("sha1").update(path).digest("hex")}.png`);
  try {
    await mkdir(dir, { recursive: true });
    await execFileAsync("/usr/bin/sips", ["-Z", "96", "-s", "format", "png", path, "--out", out], { timeout: 10_000 });
    return (await readFile(out)).toString("base64");
  } catch {
    return undefined;
  } finally {
    await rm(out, { force: true });
  }
}

/// The row icon: the sender's photo, or initials, drawn locally - nothing is
/// fetched from the network. Email lists pass `ring`, the receiving account's
/// color.
///
/// The icon goes to Raycast as a file, not as the data URI it's drawn as:
/// Raycast's window re-reads every data URI in full each time a list updates,
/// and fifty photo avatars of ~13 KB each are enough to stall its keyboard
/// navigation for seconds. A file path is a few dozen characters. Each distinct
/// avatar is written once, named by its content.
export function avatarIcon(
  address: Address | undefined,
  contact: CachedContact | null | undefined,
  options: { ring?: string } = {},
): Image.ImageLike {
  const name = address?.name?.trim() || contact?.name || address?.email || "?";
  const svg = avatarSVG({ photo: contact?.photo, name, ...options });
  return { source: avatarFile(svg) ?? svg };
}

/// Avatar files already written this session, by their data URI.
const avatarFiles = new Map<string, string | undefined>();

function avatarFile(svg: string): string | undefined {
  if (!avatarFiles.has(svg)) avatarFiles.set(svg, imageFile("avatar-icons", svg));
  return avatarFiles.get(svg);
}
