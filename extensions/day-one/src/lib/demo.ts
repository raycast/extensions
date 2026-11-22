import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { subcommand } from "./parse";

/** Where `npx raycast-faker replay` and `off` record the mode, outside the extension folder. */
const FAKER_DIR = join(homedir(), ".config", "raycast-faker", "day-one");

let mode: { mtimeMs: number; replaying: boolean } | null = null;

/** Reads the faker's mode file without depending on the faker package, which doesn't ship. Missing means off. */
function isReplaying(): boolean {
  const path = join(FAKER_DIR, "config.json");
  try {
    const { mtimeMs } = statSync(path);
    if (mode?.mtimeMs !== mtimeMs) {
      mode = { mtimeMs, replaying: (JSON.parse(readFileSync(path, "utf8")) as { mode?: string }).mode === "replay" };
    }
    return mode.replaying;
  } catch {
    return false;
  }
}

/**
 * Store screenshots without real journals. `@chrismessina/raycast-faker` fakes `fetch`, but this extension talks to a
 * local CLI, so the faker's replay mode is honored here instead: while `npx raycast-faker replay` is on (development
 * builds only), CLI commands are answered from hand-written fixtures and the CLI never runs. Store builds never replay.
 */
export function isDemo(): boolean {
  return environment.isDevelopment && isReplaying();
}

/** `key`, or a separate `demo-` key in demo mode, so demo state never mixes with real state. */
export function demoScoped(key: string): string {
  return isDemo() ? `demo-${key}` : key;
}

/** How long a demo CLI call takes, so loading states show the way they do with the real CLI. */
export const DEMO_LATENCY_MS = 150;

/** How long a demo background job runs, so its progress state can be screenshotted. */
export const DEMO_JOB_SECONDS = 3;

type DemoEntry = {
  id: string;
  journalId: string;
  daysAgo: number;
  hour: number;
  body: string;
  tags?: string[];
  starred?: boolean;
  place?: { placeName?: string; localityName?: string; administrativeArea?: string; country?: string };
  photos?: number;
  audio?: number;
};

type Fixtures = {
  journals: { id: string; name: string; color?: string }[];
  entries: DemoEntry[];
  responses: Record<string, unknown>;
  jobs: Record<string, string>;
};

/** Outside the extension folder, next to the faker's own config, because `ray publish` ships everything inside it. */
const DEMO_FIXTURES = join(FAKER_DIR, "cli-fixtures.json");

function fixtures(): Fixtures {
  try {
    return JSON.parse(readFileSync(DEMO_FIXTURES, "utf8")) as Fixtures;
  } catch {
    throw new Error(`Demo mode is on, but ${DEMO_FIXTURES} is missing or isn't valid JSON`);
  }
}

function rawEntry(e: DemoEntry) {
  const date = new Date();
  date.setDate(date.getDate() - e.daysAgo);
  date.setHours(e.hour, 0, 0, 0);
  return {
    id: e.id,
    body: e.body,
    date: date.getTime(),
    tags: e.tags ?? [],
    starred: e.starred ?? false,
    revision: { journalId: e.journalId },
    location: e.place ?? null,
    moments: [
      ...Array.from({ length: e.photos ?? 0 }, () => ({ type: "image" })),
      ...Array.from({ length: e.audio ?? 0 }, () => ({ type: "audio" })),
    ],
  };
}

function values(args: string[], flag: string): string[] {
  return args.flatMap((a, i) => (a === flag && i + 1 < args.length ? [args[i + 1]] : []));
}

function search(f: Fixtures, args: string[]) {
  const [query = ""] = values(args, "--query");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const journals = values(args, "--journal-id");
  const tags = values(args, "--tag");
  const places = values(args, "--place");
  const limit = Number(values(args, "--limit")[0] ?? 30);
  const favorite = args.includes("--favorite");
  const [from] = values(args, "--date-from");
  const [to] = values(args, "--date-to");
  const inRange = (e: DemoEntry) => {
    const date = rawEntry(e).date;
    return (!from || date >= new Date(from === "0" ? 0 : from).getTime()) && (!to || date <= new Date(to).getTime());
  };
  const items = f.entries
    .filter((e) => !journals.length || journals.includes(e.journalId))
    .filter((e) => tags.every((t) => e.tags?.includes(t)))
    .filter((e) => !places.length || places.includes(e.place?.placeName ?? ""))
    .filter((e) => !favorite || e.starred)
    .filter(inRange)
    .filter((e) => words.every((w) => `${e.body} ${(e.tags ?? []).join(" ")}`.toLowerCase().includes(w)))
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .slice(0, limit)
    .map((e, i) => ({ similarity: words.length ? 0.82 - i * 0.03 : undefined, item: rawEntry(e) }));
  return { ok: true, items };
}

export function demoStdout(args: string[]): string {
  if (args[0] === "--version") return "dayone 0.22.1\n";
  const f = fixtures();
  const command = subcommand(args);
  const out = (value: unknown) => JSON.stringify(value);
  switch (command) {
    case "list journals":
      return out({
        ok: true,
        count: f.journals.length,
        has_more: false,
        next_cursor: null,
        items: f.journals.map((j) => ({ ...j, encryption: "plaintext" })),
      });
    case "search entries":
      return out(search(f, args));
    case "entry read": {
      const [id] = values(args, "--entry-id");
      const entry = f.entries.find((e) => e.id === id);
      if (!entry) throw new Error("Entry not found");
      return out({ ok: true, journal_id: entry.journalId, entry: rawEntry(entry) });
    }
    case "entry write":
      return out({ ok: true, entry_id: "DEMO-NEW-ENTRY", journal_id: values(args, "--journal-id")[0] });
    default: {
      if (command in f.responses) return out(f.responses[command]);
      return out({ ok: true });
    }
  }
}

export function demoJobOutput(name: string): string {
  return fixtures().jobs[name] ?? "";
}
