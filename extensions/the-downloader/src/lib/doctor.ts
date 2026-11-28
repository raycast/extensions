import { YTDLP_MAX_AGE_DAYS, formatAge, ytdlpAgeDays } from "./tool-freshness.js";

// The Check Tools command: what The Downloader found on this computer, in a
// form that can be read at a glance and pasted into a bug report.

/** One command-line tool as the extension sees it. */
export type ToolCheck = {
  /** The executable's name: `yt-dlp`, `ffprobe`. */
  id: string;
  /** What it does for the extension. */
  purpose: string;
  /** Where the extension looks for it (found or not). */
  path: string;
  found: boolean;
  /** From its version banner; undefined when it's missing or wouldn't run. */
  version?: string;
  /** True when a path preference points at it, rather than the extension finding it. */
  fromPreference: boolean;
  /** Its version is still being asked for (spotDL's bundled program takes a while to start). */
  checking?: boolean;
};

export type ToolVerdict = {
  state: "ok" | "old" | "broken" | "missing" | "checking";
  label: string;
  detail?: string;
};

/** Where a tool stands: fine, too old to trust, found but not running, or not there. */
export function toolVerdict(tool: ToolCheck, now: number): ToolVerdict {
  if (!tool.found) return { state: "missing", label: "Not Installed", detail: `Looked for it at ${tool.path}` };
  if (tool.checking) return { state: "checking", label: "Checking…" };
  if (!tool.version) {
    return { state: "broken", label: "Doesn't Run", detail: "It was found, but didn't answer when asked its version." };
  }
  if (tool.id === "yt-dlp") {
    const age = ytdlpAgeDays(tool.version, now);
    if (age !== undefined && age > YTDLP_MAX_AGE_DAYS) {
      return {
        state: "old",
        label: "Outdated",
        detail: `${formatAge(age)} old. Sites change faster than that: update it.`,
      };
    }
  }
  return { state: "ok", label: "OK" };
}

/** The outcome of reading a test link with yt-dlp. */
export type LinkTest = { ok: boolean; detail: string; seconds: number };

export type Diagnostics = {
  /** `macOS 27.0 (arm64)`. */
  system: string;
  raycast: string;
  node: string;
  tools: ToolCheck[];
  /** The download folder, and whether files can be written to it. */
  folder: { path: string; writable: boolean };
  /** Settings that change how downloads run. Never secrets. */
  settings: { label: string; value: string }[];
  linkTest?: LinkTest;
};

/** `~/…` for a path inside `home`, so a report doesn't carry the user's account name. */
export function withoutHome(text: string, home: string): string {
  if (!home || home === "/") return text;
  return text.split(home).join("~");
}

/**
 * The diagnostics as Markdown for a bug report. Paths lose the home folder,
 * and nothing secret is in `Diagnostics` to begin with.
 */
export function diagnosticsReport(d: Diagnostics, now: number, home: string): string {
  const clean = (text: string) => withoutHome(text, home);
  const tools = d.tools.map((tool) => {
    const verdict = toolVerdict(tool, now);
    const where = `${clean(tool.path)}${tool.fromPreference ? " (set in preferences)" : ""}`;
    const state =
      verdict.state === "ok" ? "" : ` — ${verdict.label}${verdict.detail ? `: ${clean(verdict.detail)}` : ""}`;
    const version =
      tool.version ?? (!tool.found ? "not installed" : tool.checking ? "still checking" : "unknown version");
    return `- ${tool.id}: ${version} · ${where}${verdict.state === "checking" ? "" : state}`;
  });
  const lines = [
    "### The Downloader diagnostics",
    "",
    `- System: ${d.system}`,
    `- Raycast: ${d.raycast}`,
    `- Node.js: ${d.node}`,
    `- Download folder: ${clean(d.folder.path)}${d.folder.writable ? "" : " — can't be written to"}`,
    "",
    "**Tools**",
    "",
    ...tools,
    "",
    "**Settings**",
    "",
    ...d.settings.map((s) => `- ${s.label}: ${clean(s.value)}`),
  ];
  if (d.linkTest) {
    lines.push(
      "",
      "**Test link**",
      "",
      `- ${d.linkTest.ok ? "Read" : "Failed"} in ${d.linkTest.seconds.toFixed(1)}s: ${clean(d.linkTest.detail)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/** One line on the whole set: what, if anything, needs attention. */
export function summary(tools: ToolCheck[], now: number): string {
  const verdicts = tools.map((tool) => ({ tool, verdict: toolVerdict(tool, now) }));
  const named = (state: ToolVerdict["state"]) =>
    verdicts.filter((v) => v.verdict.state === state).map((v) => v.tool.id);
  if (named("checking").length) return "Checking versions…";
  const parts = [
    named("broken").length ? `${named("broken").join(", ")} found but not running` : "",
    named("old").length ? `${named("old").join(", ")} outdated` : "",
    named("missing").length ? `${named("missing").join(", ")} not installed` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Every tool was found and runs.";
}
