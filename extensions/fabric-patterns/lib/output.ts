// Where a finished answer goes (ISC-22..24). The Raycast calls are injected so
// the paste fallback is bun-testable.

import { basename, extname } from "node:path";
import type { Input, RunSpec } from "./argv";
import type { App } from "./input";

export type OutputMode = "clipboard" | "paste" | "file" | "clipboard-file";

/** The one spelling of each choice: the Run form, the Result view and package.json's dropdown all use it. */
export const OUTPUT_LABEL: Record<OutputMode, string> = {
  clipboard: "Copy to Clipboard",
  paste: "Paste into Current App",
  file: "Save to File",
  "clipboard-file": "Copy to Clipboard + Save to File",
};

export interface DeliverDeps {
  copy(text: string): Promise<void>;
  /** Closes Raycast and pastes into whatever is frontmost. */
  paste(text: string): Promise<void>;
  frontmostApp(): Promise<App | undefined>;
  /** Saves and returns the path as the toast and the Result show it. */
  save(text: string): Promise<string>;
  toast(title: string, message?: string): Promise<void>;
  /** A macOS notification: a HUD from a hidden view command never appears (manual test, 2026-10-18). */
  notice(text: string): Promise<void>;
}

const sameApp = (a?: App, b?: App) =>
  !!a && !!b && (a.bundleId && b.bundleId ? a.bundleId === b.bundleId : a.name === b.name);

/**
 * Paste only into the app that was in front when the run started (ISC-23); otherwise copy (ISC-24).
 * Returns what was done, for the Result view to show.
 */
export async function deliver(
  text: string,
  mode: OutputMode,
  target: App | undefined,
  deps: DeliverDeps,
): Promise<string> {
  if (mode === "paste") {
    const now = await deps.frontmostApp().catch(() => undefined);
    if (sameApp(target, now)) {
      await deps.paste(text);
      return `Pasted into ${target?.name}`;
    }
    await deps.copy(text);
    const app = target?.name ?? "the app you started in";
    void deps.notice(`Copied, not pasted: ${app} isn't in front any more`);
    // Short enough for the Result side panel, which clipped the full sentence.
    return `Copied (${app} wasn't in front)`;
  }
  const saved = mode === "file" || mode === "clipboard-file" ? await deps.save(text) : undefined;
  if (mode === "clipboard" || mode === "clipboard-file") await deps.copy(text);
  const what = mode === "file" ? "Saved" : saved ? "Copied and saved" : "Copied to clipboard";
  await deps.toast(what, saved);
  return saved ? `${what}: ${saved}` : what;
}

/** What the answer is about, from its input: the first words of text, the page, the video or the file name. */
export function inputSubject(input: Input): string | undefined {
  switch (input.kind) {
    case "text":
      return input.text.trim().split("\n")[0].split(/\s+/).slice(0, 8).join(" ");
    case "youtube": {
      const u = new URL(input.url);
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : (u.searchParams.get("v") ?? "");
      return `YouTube ${id}`.trim();
    }
    case "url": {
      const u = new URL(input.url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      return last ? `${u.hostname} ${last}` : u.hostname;
    }
    case "spotify": {
      const [kind, id] = new URL(input.url).pathname.split("/").filter(Boolean);
      return `Spotify ${kind} ${id}`;
    }
    case "image":
    case "media":
      return basename(input.path, extname(input.path));
    case "none":
      return undefined;
  }
}

/** What a run is called in titles, records and notifications: its chain, else its pattern. */
export const runLabel = (spec: Pick<RunSpec, "workflow" | "pattern">): string =>
  spec.workflow?.name ?? spec.pattern ?? "fabric";

/** `<subject> - <pattern> - 2026-10-17 1504.md`; characters unsafe in a file name become `-`. */
export function outputFileName(pattern: string | undefined, subject: string | undefined, at: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())} ${p(at.getHours())}${p(at.getMinutes())}`;
  const clean = (subject ?? "")
    .replace(/[^A-Za-z0-9_. -]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^[\s.-]+|[\s.-]+$/g, "")
    .slice(0, 60)
    .trim();
  return [clean, pattern ?? "fabric", stamp].filter(Boolean).join(" - ") + ".md";
}
