import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { formatLocalDateTime } from "./dates";
import { pageItems } from "./pagination";

const execFileAsync = promisify(execFile);

export type CaptureDetail = {
  frame_id: number;
  timestamp: string;
  application: string;
  domain: string | null;
  url: string | null;
  title: string;
  ocr_text: string | null;
  warnings?: string[];
};

export type ApplicationIdentifier = {
  bundle_id: string;
  display_name: string;
};

export type UsageTotal = {
  frame_count: number;
  recorded_seconds: number;
  recorded_seconds_human: string;
  start_ms?: number;
  end_ms?: number;
};

export type UsageItem = UsageTotal & {
  identifier: string;
  display_name?: string;
};

export type TargetUsage = UsageTotal & {
  application?: string;
  domain?: string;
};

export type UsageSession = {
  start_ms: number;
  end_ms: number;
  start: string;
  end: string;
  frame_count: number;
  duration_seconds: number;
  duration_human: string;
};

export type UsageSessions = {
  session_count: number;
  total_duration_seconds: number;
  total_duration_seconds_human: string;
  sessions: UsageSession[];
};

export type TimelineSegment = {
  frame_count: number;
  duration: string;
  selected_frame: CaptureDetail;
};

export type TimelineCover = {
  total_count: number;
  selected_count: number;
  frames: CaptureDetail[];
};

export type OcrBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

export type OcrBoxes = Omit<CaptureDetail, "ocr_text"> & {
  boxes: OcrBox[];
};

export type AccessibilityTree = Omit<CaptureDetail, "ocr_text"> & {
  has_tree: boolean;
  tree_text: string;
  total_node_count: number;
  is_partial_tree: boolean;
  stored_bytes: number;
};

export type GrabbedScreen = {
  warnings?: string[];
  image_path: string;
  timestamp: string;
  application: string;
  url: string | null;
  title: string;
  ocr_text?: string;
};

export type SearchArgs = {
  query: string;
  tr?: string;
  appFilters?: string[];
  domainFilters?: string[];
  limit?: number;
};

export type TimelineArgs = {
  tr: string;
  appFilters?: string[];
  domainFilters?: string[];
};

export type AccessibilityTreeArgs = {
  frameId: number;
  raw?: boolean;
  human?: boolean;
  includeHidden?: boolean;
  coordinates?: boolean;
  noCollapse?: boolean;
  textOnly?: boolean;
  maxDepth?: number;
  roles?: string[];
};

function coastBinary(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.coastPath?.trim() || "coast";
}

export async function runCoast(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(coastBinary(), args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
    });
    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      throw new Error(
        "coast CLI not found. Install Coast and make sure the app is running, or set the Coast Binary Path preference.",
      );
    }
    if (message.includes("maxBuffer") || message.includes("timed out")) {
      throw new Error(
        "Coast could not return this entire range within the local response budget. Narrow the date range or application/domain filters and retry; this is not an empty or complete result.",
      );
    }
    throw new Error(`coast failed: ${message}`);
  }
}

async function runCoastJson<T>(
  args: string[],
  emptyResult?: { message: string; value: T },
): Promise<T> {
  const output = await runCoast(["--json", ...args]);
  if (emptyResult && output === emptyResult.message) {
    return emptyResult.value;
  }
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new Error("coast returned an unexpected non-JSON response.");
  }
}

function pushFilters(
  args: string[],
  flag: "--app-filter" | "--domain-filter",
  values?: string[],
) {
  for (const value of values ?? []) {
    if (value.trim()) args.push(flag, value.trim());
  }
}

export async function searchCaptures(
  input: SearchArgs,
): Promise<CaptureDetail[]> {
  const args = ["query", "fts", input.query];
  if (input.tr) args.push("--tr", input.tr);
  pushFilters(args, "--app-filter", input.appFilters);
  pushFilters(args, "--domain-filter", input.domainFilters);
  args.push("--limit", String(input.limit ?? 20));
  return runCoastJson<CaptureDetail[]>(args, {
    message: "No results found.",
    value: [],
  });
}

export async function searchCapturePage(
  input: SearchArgs & { offset?: number },
) {
  const { offset, limit } = pageItems([], input, 20).pagination;
  if (!Number.isSafeInteger(offset + limit + 1))
    throw new Error("The requested search offset is too large.");
  const scope: SearchArgs = {
    query: input.query,
    tr: input.tr || `before:${formatLocalDateTime(new Date())}`,
    appFilters: input.appFilters,
    domainFilters: input.domainFilters,
    limit,
  };
  // Coast has no offset: grow a recency-ordered prefix so timestamp ties are not skipped.
  const prefix = await searchCaptures({ ...scope, limit: offset + limit + 1 });
  const page = pageItems(prefix, { offset, limit }, 20);
  const pagination = {
    ...page.pagination,
    total_count: page.pagination.has_more ? undefined : prefix.length,
  };
  return {
    scope,
    results: page.items,
    pagination,
    next_input: pagination.has_more
      ? { ...scope, offset: pagination.next_offset! }
      : undefined,
    coverage:
      "Coast's deduplicated FTS matches, not every recorded frame. Keep the returned scope for continuation. The live index is not a snapshot; delayed indexing can change results. Exhaustion applies only to this query and scope.",
  };
}

export function getCapture(frameId: number): Promise<CaptureDetail> {
  return runCoastJson<CaptureDetail>([
    "query",
    "frame",
    "--id",
    String(frameId),
    "--show-ocr",
  ]);
}

export async function getCaptureImage(
  frameId: number,
  crop = false,
): Promise<string> {
  const args = ["query", "image", "--id", String(frameId)];
  if (crop) args.push("--crop");
  const path = (await runCoast(args)).split("\n")[0]?.trim();
  if (!path) throw new Error("coast did not return a screenshot path.");
  return path;
}

export function getOcrBoxes(frameId: number): Promise<OcrBoxes> {
  return runCoastJson<OcrBoxes>(["query", "ocrboxes", "--id", String(frameId)]);
}

export function getAccessibilityTree(
  input: AccessibilityTreeArgs,
): Promise<AccessibilityTree> {
  const args = ["query", "axtree", "--id", String(input.frameId)];
  if (input.raw) args.push("--raw");
  if (input.human) args.push("--human");
  if (input.includeHidden) args.push("--include-hidden");
  if (input.coordinates) args.push("--coords");
  if (input.noCollapse) args.push("--no-collapse");
  if (input.textOnly) args.push("--text-only");
  if (input.maxDepth !== undefined) {
    args.push("--max-depth", String(input.maxDepth));
  }
  for (const role of input.roles ?? []) args.push("--role", role);
  return runCoastJson<AccessibilityTree>(args);
}

export function getAccessibilityCoverage(
  frameId: number,
): Promise<Record<string, unknown>> {
  return runCoastJson<Record<string, unknown>>([
    "query",
    "axattrs",
    "--id",
    String(frameId),
  ]);
}

export function listApplications(): Promise<ApplicationIdentifier[]> {
  return runCoastJson<ApplicationIdentifier[]>(["list", "applications"]);
}

export function listDomains(): Promise<string[]> {
  return runCoastJson<string[]>(["list", "domains"]);
}

export function totalScreenTime(tr: string): Promise<UsageTotal> {
  return runCoastJson<UsageTotal>(["usage", "time", "--tr", tr]);
}

export async function topApplications(
  tr: string,
  limit: number,
): Promise<UsageItem[]> {
  const result = await runCoastJson<{ items: UsageItem[] }>([
    "usage",
    "top-applications",
    "--tr",
    tr,
    "--limit",
    String(limit),
  ]);
  return result.items;
}

export async function topDomains(
  tr: string,
  limit: number,
): Promise<UsageItem[]> {
  const result = await runCoastJson<{ items: UsageItem[] }>([
    "usage",
    "top-domains",
    "--tr",
    tr,
    "--limit",
    String(limit),
  ]);
  return result.items;
}

export function targetUsage(
  target: string,
  kind: "application" | "domain",
  tr: string,
): Promise<TargetUsage> {
  return runCoastJson<TargetUsage>(["usage", kind, target, "--tr", tr]);
}

export function usageSessions(
  tr: string,
  appFilters?: string[],
  domainFilters?: string[],
  gapMinutes?: number,
): Promise<UsageSessions> {
  const args = ["usage", "sessions", "--tr", tr];
  pushFilters(args, "--app-filter", appFilters);
  pushFilters(args, "--domain-filter", domainFilters);
  if (gapMinutes !== undefined) args.push("--gap", String(gapMinutes));
  return runCoastJson<UsageSessions>(args);
}

export async function sampleActivity(
  input: TimelineArgs & { minimumSegmentFrames?: number },
): Promise<TimelineSegment[]> {
  const args = ["query", "sample", "--tr", input.tr];
  pushFilters(args, "--app-filter", input.appFilters);
  pushFilters(args, "--domain-filter", input.domainFilters);
  if (input.minimumSegmentFrames !== undefined) {
    args.push("--min-seg-len", String(input.minimumSegmentFrames));
  }
  const result = await runCoastJson<{
    segment_count: number;
    segments: TimelineSegment[];
  }>(args, {
    message: "No segments found.",
    value: { segment_count: 0, segments: [] },
  });
  return result.segments;
}

export function timelineCover(
  input: TimelineArgs & {
    minimumTextDifference?: number;
    minimumSeconds?: number;
  },
): Promise<TimelineCover> {
  const args = ["query", "cover", "--tr", input.tr];
  pushFilters(args, "--app-filter", input.appFilters);
  pushFilters(args, "--domain-filter", input.domainFilters);
  if (input.minimumTextDifference !== undefined) {
    args.push("--min-difference-text", String(input.minimumTextDifference));
  }
  if (input.minimumSeconds !== undefined) {
    args.push("--min-difference-seconds", String(input.minimumSeconds));
  }
  return runCoastJson<TimelineCover>(args, {
    message: "No frames found.",
    value: { total_count: 0, selected_count: 0, frames: [] },
  });
}

export function createCoastLink(when: string): Promise<string> {
  return runCoast(["link", "at", when]);
}

export function grabCurrentScreen(showOcr = false): Promise<GrabbedScreen> {
  const args = ["grab-screen"];
  if (showOcr) args.push("--show-ocr");
  return runCoastJson<GrabbedScreen>(args);
}
