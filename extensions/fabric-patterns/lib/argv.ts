// Typed run description → fabric argv. Pure: no I/O, no @raycast imports.
//
// Every element is either a fixed bare flag or `--long=value`, so a user value
// can never be read as a flag of its own (ISC-2.1). Names that fabric resolves
// to files (patterns, strategies, contexts, sessions) must be one plain path
// component.

import type { WorkflowStep } from "./workflow";

export type Input =
  | { kind: "none" }
  | { kind: "text"; text: string }
  | { kind: "youtube"; url: string; timestamps?: boolean; comments?: boolean; metadata?: boolean }
  | { kind: "url"; url: string }
  /** An open.spotify.com episode or show: fabric fetches its metadata, not the audio. */
  | { kind: "spotify"; url: string }
  | { kind: "image"; path: string }
  | { kind: "media"; path: string; transcribeModel?: string };

export interface Profile {
  /** Absolute path to the profile's `--config` YAML. */
  path: string;
  model?: string;
  vendor?: string;
}

export interface RunSpec {
  input: Input;
  pattern?: string;
  /** A chain of patterns run as one: sent instead of the pattern (ISC-79). Only the path reaches argv;
   * the steps, checked against the file just before the run, are for the Result's labels. */
  workflow?: { name: string; path: string; steps: WorkflowStep[] };
  variables?: Record<string, string>;
  strategy?: string;
  context?: string;
  session?: string;
  model?: string;
  vendor?: string;
  /** off, low, medium, high, or a token count (fabric's `--thinking`). */
  thinking?: string;
  profile?: Profile;
  search?: boolean;
  stream?: boolean;
  /** Ask for token counts (`--show-metadata`); fabric prints them only when streaming, and a preview never asks. */
  showMetadata?: boolean;
  dryRun?: boolean;
  output?: string;
}

/** The one plain-name rule: patterns, sessions, strategies, contexts, profiles. */
export const NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
export const isPlainName = (v: string) => NAME.test(v) && !v.includes("..");
// Spaces or tabs around the name are part of it to fabric (`{{ name }}`); see lib/variables.ts.
export const VAR_NAME = /^[ \t]*[A-Za-z_][A-Za-z0-9_-]*[ \t]*$/;

// fabric accepts any value here (probed on fabric 1.4.518, dry run), so a bad one would
// only fail at the vendor, on a paid run: this is the check.
const THINKING = /^(off|low|medium|high|[1-9][0-9]{0,5})$/;
export const isThinking = (v: string) => THINKING.test(v);

export class ArgvError extends Error {}

function check(value: string, what: string): string {
  if (value.includes("\0")) throw new ArgvError(`${what} contains a NUL byte`);
  return value;
}

function name(value: string, what: string): string {
  if (!isPlainName(value)) throw new ArgvError(`${what} must be a plain name: ${value}`);
  return value;
}

function httpUrl(value: string): string {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new ArgvError(`not a URL: ${value}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new ArgvError(`only http(s) URLs: ${value}`);
  return check(value, "URL");
}

/** https, host exactly open.spotify.com, an /episode/ or /show/ path: what fabric's `--spotify` takes. */
export function isSpotifyUrl(value: string): boolean {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname === "open.spotify.com" &&
    !u.username &&
    !u.password &&
    !u.port &&
    /^\/(episode|show)\/[A-Za-z0-9]+\/?$/.test(u.pathname)
  );
}

function absPath(value: string, what: string): string {
  if (!value.startsWith("/")) throw new ArgvError(`${what} must be an absolute path: ${value}`);
  return check(value, what);
}

function inputArgs(input: Input): string[] {
  switch (input.kind) {
    case "none":
    case "text":
      return [];
    case "youtube":
      return [
        `--youtube=${httpUrl(input.url)}`,
        // Always explicit: fabric only fetches the transcript by default when no other YouTube flag is set.
        input.timestamps ? "--transcript-with-timestamps" : "--transcript",
        ...(input.comments ? ["--comments"] : []),
        ...(input.metadata ? ["--metadata"] : []),
      ];
    case "url":
      return [`--scrape_url=${httpUrl(input.url)}`];
    case "spotify":
      if (!isSpotifyUrl(input.url)) throw new ArgvError(`not a Spotify episode or show URL: ${input.url}`);
      // What was checked is what is sent: the parsed form, not the string as pasted.
      return [`--spotify=${check(new URL(input.url).href, "URL")}`];
    case "image":
      return [`--attachment=${absPath(input.path, "image")}`];
    case "media":
      return [
        `--transcribe-file=${absPath(input.path, "media file")}`,
        ...(input.transcribeModel ? [`--transcribe-model=${check(input.transcribeModel, "transcription model")}`] : []),
      ];
  }
}

/** The model a run sends and the vendor that goes with it: a Config's model wins and brings only its own vendor. */
export function effectiveModel(spec: RunSpec): { model?: string; vendor?: string } {
  return spec.profile?.model
    ? { model: spec.profile.model, vendor: spec.profile.vendor }
    : { model: spec.model, vendor: spec.vendor };
}

export function buildArgv(spec: RunSpec): string[] {
  const a: string[] = [];
  // fabric ignores --session beside --workflow and writes no session (probed on fabric 1.4.518), so refuse
  // it here, ahead of the dry-run drop below, which would hide it on a preview.
  if (spec.workflow && spec.session) throw new ArgvError("a workflow can't continue a session");
  // fabric ignores --pattern beside --workflow (probed on fabric 1.4.518), so only one is ever sent.
  if (spec.workflow) a.push(`--workflow=${absPath(spec.workflow.path, "workflow")}`);
  else if (spec.pattern) a.push(`--pattern=${name(spec.pattern, "pattern")}`);
  a.push(...inputArgs(spec.input));
  for (const [k, v] of Object.entries(spec.variables ?? {})) {
    if (!VAR_NAME.test(k)) throw new ArgvError(`variable name must be a plain identifier: ${k}`);
    a.push(`--variable=${k}:${check(v, "variable value")}`);
  }
  if (spec.profile) a.push(`--config=${absPath(spec.profile.path, "config")}`);
  if (spec.strategy) a.push(`--strategy=${name(spec.strategy, "strategy")}`);
  if (spec.context) a.push(`--context=${name(spec.context, "context")}`);
  // A dry run with --session creates the session file (probed on fabric 1.4.518), so preview never passes it.
  if (spec.session && !spec.dryRun) a.push(`--session=${name(spec.session, "session")}`);

  const { model, vendor } = effectiveModel(spec);
  if (model) a.push(`--model=${check(model, "model")}`);
  if (model && vendor) a.push(`--vendor=${check(vendor, "vendor")}`);
  if (spec.thinking !== undefined) {
    if (!isThinking(spec.thinking))
      throw new ArgvError(`thinking must be off, low, medium, high or 1–999999 tokens: ${spec.thinking}`);
    a.push(`--thinking=${spec.thinking}`);
  }

  if (spec.search) a.push("--search");
  // fabric prints counts only when streaming, and a dry run's are made up (probed on fabric 1.4.518), so
  // asking for them streams the run, and a preview never asks.
  const metadata = !!spec.showMetadata && !spec.dryRun;
  if (spec.stream || metadata) a.push("--stream");
  if (metadata) a.push("--show-metadata");
  if (spec.dryRun) a.push("--dry-run");
  if (spec.output) a.push(`--output=${absPath(spec.output, "output file")}`);
  return a;
}
