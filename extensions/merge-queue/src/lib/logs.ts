export type FoundError = {
  text: string;
  message: string;
  path?: string;
  line?: number;
  fromRunner: boolean;
  inRepo?: boolean;
};

export type LogSummary = {
  errors: FoundError[];
  failedTests: string[];
  flakyTests: string[];
  testTotals: string[];
  failingStep?: string;
  excerpt: string[];
  excerptFocus: number;
  failureLine?: number;
  comparedWithPassingRun: boolean;
};

export type StepRef = { name: string; startedAt?: string };

export type SummarizeOptions = { step?: StepRef; passing?: ReadonlySet<string> };

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, "g");
const BYTE_ORDER_MARK = new RegExp(`^${String.fromCharCode(0xfeff)}`);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z ?/;
const LINE_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
const UNNUMBERED = /^##\[(endgroup|start-action|end-action)\b/;
const GROUP_START = /^##\[group\]/;
const EXIT_CODE = /^Process completed with exit code \d+/;
const EXIT_ERROR = /^##\[error\]Process completed with exit code/;
const RUNNER_ERROR = "##[error]";
const STEP_START = /^##\[group\]Run (.+)$/;
const RUNNER_META = /^##\[(group|endgroup|start-action|end-action|debug)\b/;

const PLAYWRIGHT_NUMBERED = /^\s+\d+\) (\[[^\]]+\] › .+?)\s*[─━]*\s*$/;
const PLAYWRIGHT_LISTED = /^\s{4}(\[[^\]]+\] › .+?)\s*$/;
const PLAYWRIGHT_TOTAL = /^\s+(\d+ (failed|flaky|passed|skipped|did not run|interrupted)(?: \([^)]*\))?)\s*$/;
const GO_RUNNING_TESTS = /^\s*running tests:\s*$/;
const GO_RUNNING_TEST = /^\s+(Test\S+) \(\d/;

const FAILED_TEST_PATTERNS: Record<string, RegExp> = {
  vitestJestOrGoPackage: /^\s*FAIL\s+(?<name>\S.*?)(?:\s+\(?\d+(?:\.\d+)? ?m?s\)?)?\s*$/,
  goTest: /^\s*--- FAIL: (?<name>\S+)/,
  pytestSummary: /^FAILED (?<name>\S+?)(?: - .*)?$/,
  pytestSection: /^_{3,} (?<name>\S.*?) _{3,}$/,
  rspec: /^rspec (?<name>\.\/\S+:\d+ # .+)$/,
  cargo: /^test (?<name>\S+) \.\.\. FAILED$/,
  gradle: /^\s*(?<name>[\w.$]+ > .+?) FAILED$/,
  dotnet: /^\s*Failed (?<name>[\w.]+) \[[^\]]+\]$/,
  jestOrVitestMark: /^\s*[✕×✗] (?<name>.+?)(?:\s+\(?\d+(?:\.\d+)? ?m?s\)?)?$/,
};

const TEST_TOTAL_PATTERNS: Record<string, RegExp> = {
  vitest: /^\s*(?<text>(?:Test Files|Tests)\s{2,}.+?)\s*$/,
  jest: /^\s*(?<text>(?:Test Suites|Tests):\s+.*\btotal)\s*$/,
  pytest: /^=+ (?<text>\d+ \w+(?:, \d+ \w+)* in [\d.]+s(?: \([^)]*\))?) =+$/,
  cargo: /^(?<text>test result: FAILED\..+)$/,
  rspec: /^(?<text>\d+ examples?, \d+ failures?.*)$/,
};

const REPORT_START = [
  /⎯+ Failed Tests \d+ ⎯+/,
  /^\s+1\) \[[^\]]+\] › /,
  /^=+ (FAILURES|ERRORS) =+$/,
  /^Failures:\s*$/,
  /^failures:\s*$/,
  /^Summary of all failing tests$/,
];

const STRONG_ERROR =
  /(?:^|[\s\]:])(?:error|ERROR)(?:\[\w+\])?:|\berror (?:TS|CS)?\d*:|\berror [A-Z]+\d+:|\b(?:[A-Z]\w*)?(?:Error|Exception):|\b[A-Z]\w*(?:Error|Exception)\s*$|^E {2,}\S|\bpanic:|Traceback \(most recent call last\)|\bFAIL(?:ED)?\b|Failure\/Error|[✕×✗✖] |\bfatal(?: error)?:|\bFATAL\b|ERR!|No space left|not enough space|Segmentation fault|core dumped|\bKilled\b|out of memory|\btimed out\b|\bdeadlock/;
const WEAK_ERROR =
  /\bfail(?:s|ed|ure|ures|ing)?\b|\bcannot\b|\bcan't\b|\bcould not\b|\bunable to\b|\bnot found\b|no such file|\bdenied\b|\brefused\b|\bunresolved\b|\bundefined (?:reference|symbol|method|variable|is not)|\bexpected\b.*\b(?:got|but|received|instead)\b|^\s*(?:expected|received|got|actual)\s*:/i;
const NOISE =
  /\bwarn(?:ing)?\b|\bWARN\b|deprecat|^\s*(?:Unpacking|Setting up|Selecting|Preparing to unpack|Get:\d|Downloading|Downloaded|Compiling|Installing|Resolving|Fetching|Requirement already)\b|^\s*Checking \S+ v\d|node_modules[/\\]|(?:site|dist)-packages\/|\/rustc\/|\/go\/pkg\/mod\/|^\s*Pending:|\bxfail|\bskipped\b|\b0 (?:errors?|failures?|failed)\b|\bno errors?\b|without errors/i;
const BOILERPLATE =
  /^\s*FAIL\s*$|make(?:\[\d+\])?: \*\*\*|ELIFECYCLE|npm ERR! (?:code|errno|path|syscall|command|A complete log|Lifecycle|This is probably|Failed at the)|^\s*npm ERR!\s*$|For more information about|for more details|BUILD FAILED in|FAILURE: Build failed with an exception|Process completed with exit code|exited with (?:code|status)|exit status \d+|(?:Command )?failed with exit code|due to \d+ previous errors?|could not compile|evaluation failed|: FAIL code \d+|Found \d+ errors? in|^\s*\d+ (?:failed|errors?)\b|^\s*Summary of Failures/i;

const LOCATION_PATTERNS = [
  /File "(?<path>[^"]+)", line (?<line>\d+)/,
  /(?<path>(?:\b[A-Za-z]:(?=[/\\]))?[\w@.+\-/\\]*[\w@+-]\.[A-Za-z][\w]{0,5})\((?<line>\d+),\d+\)/,
  /(?<path>(?:\b[A-Za-z]:(?=[/\\]))?[\w@.+\-/\\]*[\w@+-]\.[A-Za-z][\w]{0,5}):(?<line>\d+)(?::\d+)?/,
];
const LOCATION_LEAD = /^\s*(?:-->|at\s|File\s|in\s)/;
const WORKSPACE_PREFIX = [
  /^(?:[A-Za-z]:)?\/(?:home|Users)\/runner\/work\/[^/]+\/[^/]+\//,
  /^[A-Za-z]:\/a\/[^/]+\/[^/]+\//,
  /^\/__w\/[^/]+\/[^/]+\//,
  /^\/github\/workspace\//,
  /^.*?\/_?work\/[^/]+\/[^/]+\//,
];
const NOT_REPO_PATH =
  /node_modules\/|(?:site|dist)-packages\/|\.cargo\/registry|\/rustc\/|go\/pkg\/mod\/|^node:|^internal\/|<anonymous>|^\/|^[A-Za-z]:\//;

const MAX_ERRORS = 15;
const MAX_FOUND = 8;
const MAX_TESTS = 20;
const MAX_TEXT = 300;
const EXCERPT_LINES = 80;
const CONTEXT_BEFORE = 30;
const SMALL_DIFF = 10;
const COLLAPSE_RUN = 3;
const MIN_CONTAINED = 20;
const MENTIONS_FAILURE = 2;

function cleanLine(line: string): string {
  return line.replace(ANSI, "").replace(TIMESTAMP, "");
}

function splitLog(raw: string): { stamped: string[]; lines: string[] } {
  const stamped = raw.replace(BYTE_ORDER_MARK, "").split(/\r?\n/);
  return { stamped, lines: stamped.map(cleanLine) };
}

function normaliseForComparison(line: string): string {
  return line
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "U")
    .replace(/\b[0-9a-f]{7,}\b/gi, "H")
    .replace(/\/tmp\/[\w.-]+/g, "/tmp/T")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprint(line: string): string {
  const text = normaliseForComparison(cleanLine(line));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function logFingerprints(raw: string): string[] {
  const fingerprints = new Set<string>();
  for (const line of splitLog(raw).lines) {
    if (line.trim() && !RUNNER_META.test(line)) {
      fingerprints.add(fingerprint(line));
    }
  }
  return [...fingerprints];
}

function pushUnique(target: string[], value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed && !target.includes(trimmed) && target.length < max) {
    target.push(trimmed);
  }
}

function truncate(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function lastIndexMatching(lines: string[], pattern: RegExp, before = lines.length): number {
  for (let index = Math.min(before, lines.length) - 1; index >= 0; index--) {
    if (pattern.test(lines[index])) {
      return index;
    }
  }
  return -1;
}

function firstIndexMatching(lines: string[], pattern: RegExp, from: number, to: number): number {
  for (let index = Math.max(0, from); index < Math.min(to, lines.length); index++) {
    if (pattern.test(lines[index])) {
      return index;
    }
  }
  return -1;
}

type Region = { failingStep?: string; from: number; end: number };

function failingRegion(lines: string[], stepEnd = -1): Region {
  const exitIndex = stepEnd >= 0 ? stepEnd : lastIndexMatching(lines, EXIT_ERROR);
  const failureEnd = exitIndex >= 0 ? exitIndex : lastIndexMatching(lines, /##\[error\]/);
  const end = failureEnd >= 0 ? failureEnd : lines.length;
  const stepIndex = lastIndexMatching(lines, STEP_START, end);
  const failingStep = stepIndex >= 0 ? STEP_START.exec(lines[stepIndex])?.[1]?.trim() : undefined;
  const commandEcho = stepIndex >= 0 ? firstIndexMatching(lines, /^##\[endgroup\]/, stepIndex, end) : -1;
  const from = commandEcho >= 0 ? commandEcho + 1 : stepIndex >= 0 ? stepIndex + 1 : Math.max(0, end - EXCERPT_LINES);
  return { failingStep, from, end };
}

function repoPath(raw: string): string | undefined {
  let path = raw.replace(/\\/g, "/");
  for (const prefix of WORKSPACE_PREFIX) {
    path = path.replace(prefix, "");
  }
  path = path.replace(/^\.\//, "");
  return NOT_REPO_PATH.test(path) || path.includes("://") ? undefined : path;
}

export function findLocation(line: string): { path: string; line: number; start: number; end: number } | undefined {
  for (const pattern of LOCATION_PATTERNS) {
    const match = pattern.exec(line);
    const path = match?.groups?.path;
    if (!match || !path || line.slice(Math.max(0, match.index - 3), match.index).endsWith("://")) {
      continue;
    }
    const resolved = repoPath(path);
    if (resolved) {
      return {
        path: resolved,
        line: Number(match.groups!.line),
        start: match.index,
        end: match.index + match[0].length,
      };
    }
  }
  return undefined;
}

export function scoreLine(line: string): number {
  if (!line.trim() || RUNNER_META.test(line)) {
    return 0;
  }
  let score = 0;
  if (STRONG_ERROR.test(line)) {
    score += 4;
  }
  if (WEAK_ERROR.test(line)) {
    score += 2;
  }
  if (score > 0 && findLocation(line)) {
    score += 1;
  }
  if (NOISE.test(line)) {
    score -= 4;
  }
  if (BOILERPLATE.test(line)) {
    score -= 4;
  }
  return score;
}

function withContinuation(lines: string[], index: number, text: string): string {
  const trimmed = text.trim();
  if (!trimmed.endsWith(":")) {
    return trimmed;
  }
  const next = lines.slice(index + 1, index + 3).find((line) => line.trim() && !RUNNER_META.test(line));
  return next ? `${trimmed} ${next.trim()}` : trimmed;
}

function toFoundError(lines: string[], index: number, text: string, fromRunner: boolean): FoundError {
  const trimmed = withContinuation(lines, index, text);
  let location = findLocation(trimmed);
  let message = trimmed;
  if (location && location.start <= 2) {
    message = trimmed
      .slice(location.end)
      .replace(/^[\s:,-]+/, "")
      .trim();
  }
  if (!location) {
    for (let next = index + 1; next <= index + 2 && next < lines.length; next++) {
      if (LOCATION_LEAD.test(lines[next])) {
        location = findLocation(lines[next]);
        if (location) {
          break;
        }
      }
    }
  }
  return {
    text: truncate(trimmed),
    message: truncate(message || trimmed),
    path: location?.path,
    line: location?.line,
    fromRunner,
  };
}

function overlaps(a: string, b: string): boolean {
  const left = normaliseForComparison(a);
  const right = normaliseForComparison(b);
  return (
    left === right ||
    (right.length >= MIN_CONTAINED && left.includes(right)) ||
    (left.length >= MIN_CONTAINED && right.includes(left))
  );
}

function addFound(target: FoundError[], error: FoundError, max: number) {
  if (target.length < max && error.message && !target.some((other) => overlaps(other.text, error.text))) {
    target.push(error);
  }
}

function runnerErrors(lines: string[]): FoundError[] {
  const errors: FoundError[] = [];
  lines.forEach((line, index) => {
    const at = line.indexOf(RUNNER_ERROR);
    if (at < 0) {
      return;
    }
    const message = line.slice(at + RUNNER_ERROR.length);
    if (!EXIT_CODE.test(message)) {
      addFound(errors, toFoundError(lines, index, message, true), MAX_ERRORS);
    }
  });
  return errors;
}

type Candidates = { indices: number[] };

function errorCandidates(
  lines: string[],
  region: Region,
  isKnown: (index: number) => boolean,
  comparing: boolean,
  reportIndex: number,
): Candidates {
  const scored: number[] = [];
  const novel: number[] = [];
  for (let index = region.from; index < region.end; index++) {
    const line = lines[index];
    if (!line.trim() || RUNNER_META.test(line) || line.includes(RUNNER_ERROR)) {
      continue;
    }
    const known = isKnown(index);
    if (!known) {
      novel.push(index);
    }
    if (scoreLine(line) >= 3) {
      scored.push(index);
    }
  }
  const inReport = scored.filter((index) => index >= reportIndex);
  if (reportIndex >= 0 && inReport.length > 0) {
    scored.splice(0, scored.length, ...inReport);
  }
  const novelSet = new Set(novel);
  const novelScored = scored.filter((index) => novelSet.has(index));
  if (!comparing) {
    return { indices: scored };
  }
  if (novelScored.length > 0) {
    return { indices: novelScored };
  }
  if (novel.length > 0 && novel.length <= SMALL_DIFF) {
    return { indices: novel };
  }
  return { indices: scored };
}

function collectTests(lines: string[], from: number, to: number, isKnown: (index: number) => boolean) {
  const failedTests: string[] = [];
  const flakyTests: string[] = [];
  const numberedFailures: string[] = [];
  const totals = new Map<string, string>();
  let listing: string[] | undefined;
  let listingPattern: RegExp | undefined;

  for (let index = from; index < to; index++) {
    const line = lines[index];
    for (const [tool, pattern] of Object.entries(TEST_TOTAL_PATTERNS)) {
      const text = pattern.exec(line)?.groups?.text;
      if (text) {
        totals.set(`${tool} ${text.replace(/[\d.].*$/, "")}`, text.replace(/\s{2,}/g, " "));
      }
    }
    const playwrightTotal = PLAYWRIGHT_TOTAL.exec(line);
    if (playwrightTotal) {
      totals.set(`playwright ${playwrightTotal[2]}`, playwrightTotal[1]);
    }
    if (line.includes(RUNNER_ERROR) || isKnown(index)) {
      listing = undefined;
      continue;
    }

    if (playwrightTotal) {
      listingPattern = PLAYWRIGHT_LISTED;
      listing =
        playwrightTotal[2] === "failed" || playwrightTotal[2] === "interrupted"
          ? failedTests
          : playwrightTotal[2] === "flaky"
            ? flakyTests
            : undefined;
      continue;
    }
    if (GO_RUNNING_TESTS.test(line)) {
      listing = failedTests;
      listingPattern = GO_RUNNING_TEST;
      continue;
    }

    const listed = listing && listingPattern ? listingPattern.exec(line) : null;
    if (listing && listed) {
      pushUnique(listing, listed[1], MAX_TESTS);
      continue;
    }
    listing = undefined;

    const numbered = PLAYWRIGHT_NUMBERED.exec(line);
    if (numbered) {
      pushUnique(numberedFailures, numbered[1], MAX_TESTS);
      continue;
    }

    if (!line.includes("##[")) {
      for (const pattern of Object.values(FAILED_TEST_PATTERNS)) {
        const name = pattern.exec(line)?.groups?.name;
        if (name) {
          pushUnique(failedTests, name, MAX_TESTS);
          break;
        }
      }
    }
  }

  if (failedTests.length === 0) {
    for (const test of numberedFailures) {
      if (!flakyTests.includes(test)) {
        pushUnique(failedTests, test, MAX_TESTS);
      }
    }
  }
  return { failedTests, flakyTests, testTotals: [...totals.values()] };
}

function reportStart(lines: string[], region: Region, isKnown: (index: number) => boolean): number {
  for (let index = region.from; index < region.end; index++) {
    if (!isKnown(index) && REPORT_START.some((pattern) => pattern.test(lines[index]))) {
      return index;
    }
  }
  return -1;
}

function isFiller(line: string): boolean {
  return !line.trim() || RUNNER_META.test(line);
}

function collapsedExcerpt(
  lines: string[],
  region: Region,
  isKnown: (index: number) => boolean,
  comparing: boolean,
  anchor: number,
  context: number,
): { excerpt: string[]; excerptFocus: number } {
  const hideable = (index: number) => isKnown(index) && scoreLine(lines[index]) < MENTIONS_FAILURE;
  const collapsed: string[] = [];
  let focus = -1;
  let index = region.from;
  while (index < region.end) {
    if (RUNNER_META.test(lines[index])) {
      index++;
      continue;
    }
    let run = index;
    while (run < region.end && run !== anchor && (hideable(run) || (comparing && isFiller(lines[run])))) {
      run++;
    }
    const known = lines.slice(index, run).filter((line) => !isFiller(line)).length;
    if (known >= COLLAPSE_RUN) {
      collapsed.push(`⋯ ${known} lines also in the last passing run`);
      index = run;
      continue;
    }
    if (index === anchor) {
      focus = collapsed.length;
    }
    collapsed.push(lines[index].replace(RUNNER_ERROR, "✖ "));
    index++;
  }
  while (collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === "") {
    collapsed.pop();
  }
  if (focus < 0) {
    const excerpt = collapsed.slice(-EXCERPT_LINES);
    return { excerpt, excerptFocus: excerpt.length };
  }
  const start = Math.max(0, focus - context);
  const excerpt = collapsed.slice(start, start + EXCERPT_LINES);
  return { excerpt, excerptFocus: Math.min(focus - start, excerpt.length) };
}

function knownStepStart(stamped: string[], lines: string[], step: StepRef, before: number): number {
  const condition = `##[debug]Evaluating condition for step: '${step.name}'`;
  for (let index = before; index >= 0; index--) {
    if (lines[index].startsWith(condition)) {
      return index;
    }
  }
  const startedAt = step.startedAt?.slice(0, 19);
  if (startedAt) {
    for (let index = 0; index <= before; index++) {
      const time = LINE_TIME.exec(stamped[index])?.[1];
      if (time && time >= startedAt && GROUP_START.test(lines[index])) {
        return index;
      }
    }
  }
  return -1;
}

function stepStartIndex(stamped: string[], lines: string[], step: StepRef, before: number): number {
  const start = knownStepStart(stamped, lines, step, before);
  return start >= 0 ? start : lastIndexMatching(lines, STEP_START, before + 1);
}

function stepEndIndex(stamped: string[], lines: string[], step: StepRef | undefined): number {
  const start = step ? knownStepStart(stamped, lines, step, lines.length - 1) : -1;
  return start >= 0 ? firstIndexMatching(lines, EXIT_ERROR, start, lines.length) : -1;
}

function lineInStep(stamped: string[], lines: string[], step: StepRef, target: number): number | undefined {
  if (target < 0) {
    return undefined;
  }
  const start = stepStartIndex(stamped, lines, step, target);
  if (start < 0) {
    return undefined;
  }
  let line = 0;
  for (let index = start; index <= target; index++) {
    if (!UNNUMBERED.test(lines[index])) {
      line++;
    }
  }
  return line;
}

function failureTarget(lines: string[], region: Region, reportIndex: number, candidates: number[]): number {
  const stepIndex = lastIndexMatching(lines, STEP_START, region.end);
  const firstError = firstIndexMatching(
    lines,
    /##\[error\](?!Process completed with exit code)/,
    stepIndex >= 0 ? stepIndex : 0,
    region.end,
  );
  if (firstError >= 0) {
    return firstError;
  }
  if (reportIndex >= 0) {
    return reportIndex;
  }
  if (candidates.length > 0) {
    return candidates[0];
  }
  return region.end < lines.length ? region.end : -1;
}

function analyse(raw: string, passing?: ReadonlySet<string>, step?: StepRef) {
  const { stamped, lines } = splitLog(raw);
  const knownCache = new Map<number, boolean>();
  const isKnown = (index: number) => {
    if (!passing || !lines[index]?.trim()) {
      return false;
    }
    let known = knownCache.get(index);
    if (known === undefined) {
      known = passing.has(fingerprint(lines[index]));
      knownCache.set(index, known);
    }
    return known;
  };
  const region = failingRegion(lines, stepEndIndex(stamped, lines, step));
  const reportIndex = reportStart(lines, region, isKnown);
  const candidates = errorCandidates(lines, region, isKnown, Boolean(passing), reportIndex);
  return { stamped, lines, region, candidates, reportIndex, isKnown };
}

export function failureLineInStep(raw: string, step: StepRef, passing?: ReadonlySet<string>): number | undefined {
  const { stamped, lines, region, candidates, reportIndex } = analyse(raw, passing, step);
  return lineInStep(stamped, lines, step, failureTarget(lines, region, reportIndex, candidates.indices));
}

export function summarizeLog(raw: string, options: SummarizeOptions = {}): LogSummary {
  const { stamped, lines, region, candidates, reportIndex, isKnown } = analyse(raw, options.passing, options.step);

  const errors = runnerErrors(lines);
  const found: FoundError[] = [];
  for (const index of candidates.indices) {
    addFound(found, toFoundError(lines, index, lines[index], false), MAX_FOUND);
  }
  for (const error of found) {
    addFound(errors, error, MAX_ERRORS + MAX_FOUND);
  }

  let tests = collectTests(lines, region.from, region.end, isKnown);
  if (tests.failedTests.length === 0 && tests.flakyTests.length === 0) {
    const whole = collectTests(lines, 0, lines.length, isKnown);
    tests = { ...whole, testTotals: tests.testTotals.length > 0 ? tests.testTotals : whole.testTotals };
  }

  const firstErrorInStep = firstIndexMatching(
    lines,
    /##\[error\](?!Process completed with exit code)/,
    region.from,
    region.end,
  );
  const firstCandidate = candidates.indices[0] ?? -1;
  const anchor =
    reportIndex >= 0
      ? reportIndex
      : firstErrorInStep >= 0 && (firstCandidate < 0 || firstErrorInStep < firstCandidate)
        ? firstErrorInStep
        : firstCandidate;
  const context = reportIndex >= 0 ? 0 : CONTEXT_BEFORE;

  return {
    errors,
    ...tests,
    failingStep: region.failingStep,
    ...collapsedExcerpt(lines, region, isKnown, Boolean(options.passing), anchor, context),
    failureLine: options.step
      ? lineInStep(stamped, lines, options.step, failureTarget(lines, region, reportIndex, candidates.indices))
      : undefined,
    comparedWithPassingRun: Boolean(options.passing),
  };
}

export function excerptAround(
  summary: Pick<LogSummary, "excerpt" | "excerptFocus">,
  size: number,
  before = 8,
): string[] {
  const { excerpt, excerptFocus } = summary;
  if (excerptFocus >= excerpt.length) {
    return excerpt.slice(-size);
  }
  const start = Math.max(0, Math.min(excerptFocus - before, excerpt.length - size));
  return excerpt.slice(start, start + size);
}
