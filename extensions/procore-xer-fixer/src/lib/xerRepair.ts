import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { finished } from "node:stream/promises";
import { v5 as uuidv5 } from "uuid";

/** Stable namespace string for UUIDv5 WBS paths; do not change. */
export const WBS_GUID_NAMESPACE_PREFIX = "procore-xer-projwbs-path:";

/** Output folder name created as a sibling of the source `.xer` (same parent directory). */
export const FIXED_XER_DIR_NAME = "fixed-xer";

export class XerRepairValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XerRepairValidationError";
  }
}

/**
 * Detects the dominant newline sequence in a file body so writes round-trip on Windows and macOS.
 *
 * @param body - UTF-8 sample (e.g. first 64 KB of the file)
 * @returns `"\r\n"` if CRLF appears more than LF-only, otherwise `"\n"`
 *
 * @example
 * ```ts
 * detectEol("a\r\nb\r\nc"); // "\r\n"
 * ```
 */
export function detectEol(body: string): "\r\n" | "\n" {
  const crlf = body.split("\r\n").length - 1;
  const lfOnly = body.split("\n").length - 1 - crlf;
  return crlf >= lfOnly && crlf > 0 ? "\r\n" : "\n";
}

/**
 * Reads a small prefix of a file and returns the dominant newline style.
 *
 * @param filePath - Path to the XER file
 */
async function detectEolFromFilePrefix(
  filePath: string,
): Promise<"\r\n" | "\n"> {
  const fh = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(65536);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const snippet = buf.subarray(0, bytesRead).toString("utf8");
    return detectEol(snippet);
  } finally {
    await fh.close();
  }
}

/**
 * Returns whether the file ends with a line terminator (LF or CRLF).
 *
 * @param filePath - Path to the file
 */
async function readFileEndsWithNewline(filePath: string): Promise<boolean> {
  const fh = await fs.promises.open(filePath, "r");
  try {
    const stat = await fh.stat();
    if (stat.size === 0) return false;
    const n = Number(stat.size);
    const readSize = Math.min(4096, n);
    const buf = Buffer.alloc(readSize);
    await fh.read(buf, 0, readSize, n - readSize);
    const last = buf[readSize - 1];
    return last === 0x0a;
  } finally {
    await fh.close();
  }
}

function normalizeSegment(raw: string | undefined): string {
  if (raw === undefined || raw === null) return "";
  return raw.replace(/\s+/g, " ").trim();
}

function wbsSegment(row: Record<string, string>): string {
  const shortName = normalizeSegment(row.wbs_short_name);
  if (shortName.length > 0) return shortName;
  const name = normalizeSegment(row.wbs_name);
  if (name.length > 0) return name;
  return normalizeSegment(row.wbs_id);
}

function normalizeParentId(parent: string | undefined): string | null {
  if (parent === undefined || parent === null) return null;
  const t = parent.trim();
  if (t.length === 0 || t === "0") return null;
  return t;
}

function isBlankGuid(guid: string | undefined): boolean {
  if (guid === undefined || guid === null) return true;
  return guid.trim().length === 0;
}

/**
 * Returns the UUIDv5 assigned to a WBS path (same formula Procore-fixed exports use).
 *
 * UUIDv5 is deterministic: the same `wbsPath` string always produces the same GUID. The
 * extension builds each node's path from `wbs_short_name` (else `wbs_name`, else `wbs_id`)
 * joined with `.` from root to node; if that path string matches another export, the GUID
 * matches too—even when numeric `wbs_id` values differ.
 *
 * @param wbsPath - Period-separated Primavera WBS path (e.g. `PRJ.Area1`)
 * @returns Lowercase UUID string
 *
 * @example
 * ```ts
 * guidForWbsPath("PRJ.W1"); // always the same value for this path
 * ```
 */
export function guidForWbsPath(wbsPath: string): string {
  if (typeof wbsPath !== "string" || wbsPath.trim().length === 0) {
    throw new XerRepairValidationError("wbsPath must be a non-empty string.");
  }
  const name = `${WBS_GUID_NAMESPACE_PREFIX}${wbsPath}`;
  return uuidv5(name, uuidv5.URL);
}

export interface XerRepairCounts {
  /** Rows in PROJWBS before repair */
  projwbsRowCount: number;
  /** Rows in TASK before repair */
  taskRowCount: number;
  blankProjwbsGuidsBefore: number;
  duplicateProjwbsGuidsBefore: number;
  blankTargetStartBefore: number;
  blankTargetEndBefore: number;
  blankProjwbsGuidsAfter: number;
  duplicateProjwbsGuidsAfter: number;
  blankTargetStartAfter: number;
  blankTargetEndAfter: number;
  unresolvedTasksAfterRepair: number;
}

export interface XerRepairResult {
  counts: XerRepairCounts;
  /** Absolute path to the output directory (`fixed-xer` next to the source, unless explicit paths are used). */
  outputDirectory: string;
  outputXerPath: string;
  /** Set only when `generateMap: true` was passed. */
  outputMapPath: string | null;
  wbsPathById: Map<string, string>;
}

function splitXerLine(line: string): string[] {
  return line.split("\t");
}

function isBlankField(v: string | undefined): boolean {
  if (v === undefined || v === null) return true;
  return v.trim().length === 0;
}

function firstNonBlank(
  ...candidates: (string | undefined)[]
): string | undefined {
  for (const c of candidates) {
    if (!isBlankField(c)) return c;
  }
  return undefined;
}

function rowObject(
  fieldNames: string[],
  cells: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < fieldNames.length; i++) {
    const key = fieldNames[i];
    if (!key) continue;
    out[key] = cells[i + 1] ?? "";
  }
  return out;
}

function setRowField(
  cells: string[],
  fieldNames: string[],
  field: string,
  value: string,
): void {
  const idx = fieldNames.indexOf(field);
  if (idx < 0) return;
  const pos = idx + 1;
  while (cells.length <= pos) cells.push("");
  cells[pos] = value;
}

function rejoinRow(cells: string[]): string {
  return cells.join("\t");
}

function countDuplicateGuids(rows: Record<string, string>[]): number {
  const map = new Map<string, number>();
  for (const r of rows) {
    const g = (r.guid ?? "").trim();
    if (g.length === 0) continue;
    map.set(g, (map.get(g) ?? 0) + 1);
  }
  let dups = 0;
  for (const n of map.values()) if (n > 1) dups += n - 1;
  return dups;
}

interface ParseState {
  currentTable: string | null;
  pendingTableName: string | null;
  currentFieldNames: string[] | null;
  projwbsFieldNames: string[] | null;
  taskFieldNames: string[] | null;
}

function createParseState(): ParseState {
  return {
    currentTable: null,
    pendingTableName: null,
    currentFieldNames: null,
    projwbsFieldNames: null,
    taskFieldNames: null,
  };
}

function updateStateForLine(trimmed: string, state: ParseState): void {
  if (trimmed.startsWith("%T")) {
    state.currentFieldNames = null;
    const after = trimmed.slice(2).trimStart();
    if (after.length === 0) {
      state.pendingTableName = "__NEXT_LINE__";
      state.currentTable = null;
      return;
    }
    state.pendingTableName = null;
    state.currentTable = after.split("\t")[0]?.trim() ?? null;
    return;
  }

  if (state.pendingTableName === "__NEXT_LINE__") {
    state.pendingTableName = null;
    state.currentTable = trimmed.split("\t")[0]?.trim() ?? trimmed;
    return;
  }

  if (trimmed.startsWith("%F")) {
    const cells = splitXerLine(trimmed);
    const fields = cells.slice(1).map((c) => c.trim());
    state.currentFieldNames = fields;
    if (state.currentTable === "PROJWBS") state.projwbsFieldNames = fields;
    if (state.currentTable === "TASK") state.taskFieldNames = fields;
  }
}

interface ScanPassResult {
  eol: "\r\n" | "\n";
  fileEndsWithNewline: boolean;
  projwbsRows: Record<string, string>[];
  taskRowCount: number;
  blankTargetStartBefore: number;
  blankTargetEndBefore: number;
}

/**
 * First streaming pass: loads only PROJWBS row objects (small) and TASK statistics.
 *
 * @param filePath - Source `.xer` path
 */
async function scanXerMetadata(filePath: string): Promise<ScanPassResult> {
  const [eol, fileEndsWithNewline] = await Promise.all([
    detectEolFromFilePrefix(filePath),
    readFileEndsWithNewline(filePath),
  ]);

  const state = createParseState();
  const projwbsRows: Record<string, string>[] = [];
  let taskRowCount = 0;
  let blankTargetStartBefore = 0;
  let blankTargetEndBefore = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const trimmed = rawLine.trimEnd();
    if (trimmed.length === 0) continue;

    if (
      trimmed.startsWith("%T") ||
      state.pendingTableName === "__NEXT_LINE__"
    ) {
      updateStateForLine(trimmed, state);
      continue;
    }

    if (trimmed.startsWith("%F")) {
      updateStateForLine(trimmed, state);
      continue;
    }

    if (trimmed.startsWith("%R")) {
      if (!state.currentTable || !state.currentFieldNames) continue;
      const cells = splitXerLine(trimmed);
      if (state.currentTable === "PROJWBS") {
        projwbsRows.push(rowObject(state.currentFieldNames, cells));
      } else if (state.currentTable === "TASK") {
        taskRowCount++;
        const row = rowObject(state.currentFieldNames, cells);
        if (isBlankField(row.target_start_date)) blankTargetStartBefore++;
        if (isBlankField(row.target_end_date)) blankTargetEndBefore++;
      }
    }
  }

  if (!state.projwbsFieldNames || state.projwbsFieldNames.length === 0) {
    throw new XerRepairValidationError(
      "XER is missing a PROJWBS field header (%F).",
    );
  }
  if (!state.taskFieldNames || state.taskFieldNames.length === 0) {
    throw new XerRepairValidationError(
      "XER is missing a TASK field header (%F).",
    );
  }

  return {
    eol,
    fileEndsWithNewline,
    projwbsRows,
    taskRowCount,
    blankTargetStartBefore,
    blankTargetEndBefore,
  };
}

/**
 * Second streaming pass: copies the XER to `outPath`, rewriting PROJWBS and TASK `%R` lines.
 *
 * @returns TASK-related after-repair counters
 */
async function streamTransformXer(
  inputPath: string,
  outPath: string,
  eol: "\r\n" | "\n",
  fileEndsWithNewline: boolean,
  guidByWbsId: Map<string, string>,
): Promise<{
  blankTargetStartAfter: number;
  blankTargetEndAfter: number;
  unresolvedTasksAfterRepair: number;
}> {
  const state = createParseState();

  let blankTargetStartAfter = 0;
  let blankTargetEndAfter = 0;
  let unresolvedTasksAfterRepair = 0;

  const ws = fs.createWriteStream(outPath, { encoding: "utf8" });
  let pendingSeparator = false;

  const writePhysicalLine = async (text: string): Promise<void> => {
    if (pendingSeparator)
      await new Promise<void>((resolve, reject) => {
        ws.write(eol, (err) => (err ? reject(err) : resolve()));
      });
    pendingSeparator = true;
    await new Promise<void>((resolve, reject) => {
      ws.write(text, (err) => (err ? reject(err) : resolve()));
    });
  };

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const trimmed = rawLine.trimEnd();
    let outLine = rawLine;

    if (trimmed.length === 0) {
      await writePhysicalLine(outLine);
      continue;
    }

    if (
      trimmed.startsWith("%T") ||
      state.pendingTableName === "__NEXT_LINE__"
    ) {
      updateStateForLine(trimmed, state);
      await writePhysicalLine(outLine);
      continue;
    }

    if (trimmed.startsWith("%F")) {
      updateStateForLine(trimmed, state);
      await writePhysicalLine(outLine);
      continue;
    }

    if (trimmed.startsWith("%R")) {
      if (
        state.currentTable === "PROJWBS" &&
        state.currentFieldNames &&
        state.currentFieldNames.length > 0
      ) {
        const cells = splitXerLine(trimmed);
        const row = rowObject(state.currentFieldNames, cells);
        const id = (row.wbs_id ?? "").trim();
        const guid = id.length > 0 ? (guidByWbsId.get(id) ?? "") : "";
        if (guid.length > 0)
          setRowField(cells, state.currentFieldNames, "guid", guid);
        outLine = rejoinRow(cells);
      } else if (
        state.currentTable === "TASK" &&
        state.currentFieldNames &&
        state.currentFieldNames.length > 0
      ) {
        const cells = splitXerLine(trimmed);
        const row = rowObject(state.currentFieldNames, cells);
        const ts0 = row.target_start_date;
        const te0 = row.target_end_date;
        let te = te0;
        let ts = ts0;
        if (isBlankField(te)) {
          const v = firstNonBlank(
            ts0,
            row.act_end_date,
            row.act_start_date,
            row.early_end_date,
            row.late_end_date,
          );
          if (v !== undefined) {
            te = v;
            setRowField(cells, state.currentFieldNames, "target_end_date", v);
          }
        }
        if (isBlankField(ts)) {
          const v = firstNonBlank(
            te,
            row.act_start_date,
            row.act_end_date,
            row.early_start_date,
            row.late_start_date,
          );
          if (v !== undefined) {
            ts = v;
            setRowField(cells, state.currentFieldNames, "target_start_date", v);
          }
        }
        outLine = rejoinRow(cells);
        const after = rowObject(state.currentFieldNames, cells);
        if (isBlankField(after.target_start_date)) blankTargetStartAfter++;
        if (isBlankField(after.target_end_date)) blankTargetEndAfter++;
        if (
          isBlankField(after.target_start_date) ||
          isBlankField(after.target_end_date)
        )
          unresolvedTasksAfterRepair++;
      }
    }

    await writePhysicalLine(outLine);
  }

  if (fileEndsWithNewline) {
    await new Promise<void>((resolve, reject) => {
      ws.write(eol, (err) => (err ? reject(err) : resolve()));
    });
  }

  ws.end();
  await finished(ws);

  return {
    blankTargetStartAfter,
    blankTargetEndAfter,
    unresolvedTasksAfterRepair,
  };
}

/**
 * Repairs PROJWBS GUIDs and TASK target dates for Procore Scheduling import.
 * Uses two streaming passes over the source file so large XER files do not exhaust the JS heap.
 *
 * @param sourceXerPath - Absolute path to the source `.xer` file
 * @param options - Optional overrides; by default writes under a `fixed-xer` folder next to the source file.
 * @returns Paths written and before/after counts
 * @throws {@link XerRepairValidationError} on structural issues or duplicate WBS paths
 *
 * @example
 * ```ts
 * await repairProcoreXer("/Users/me/project.xer");
 * ```
 */
export async function repairProcoreXer(
  sourceXerPath: string,
  options: {
    /** When `true`, also writes a WBS path → GUID `.tsv` next to the repaired XER. Default: off. */
    generateMap?: boolean;
    /** Full path to repaired `.xer` (for tests; parent directory is created if needed). */
    outputXerPath?: string;
    /** Full path to `.tsv` map; only used when `generateMap` is `true`. Requires `outputXerPath` if set. */
    outputMapPath?: string;
  } = {},
): Promise<XerRepairResult> {
  if (typeof sourceXerPath !== "string" || sourceXerPath.trim().length === 0) {
    throw new XerRepairValidationError("sourceXerPath is required.");
  }
  const resolvedSource = path.resolve(sourceXerPath);
  if (!fs.existsSync(resolvedSource)) {
    throw new XerRepairValidationError(
      `Source file not found: ${resolvedSource}`,
    );
  }
  const ext = path.extname(resolvedSource).toLowerCase();
  if (ext !== ".xer") {
    throw new XerRepairValidationError(
      `Expected a .xer file, got extension "${ext}".`,
    );
  }

  const scan = await scanXerMetadata(resolvedSource);
  const {
    eol,
    fileEndsWithNewline,
    projwbsRows,
    taskRowCount,
    blankTargetStartBefore,
    blankTargetEndBefore,
  } = scan;

  const blankProjwbsGuidsBefore = projwbsRows.filter((r) =>
    isBlankGuid(r.guid),
  ).length;
  const duplicateProjwbsGuidsBefore = countDuplicateGuids(projwbsRows);

  const counts: XerRepairCounts = {
    projwbsRowCount: projwbsRows.length,
    taskRowCount,
    blankProjwbsGuidsBefore,
    duplicateProjwbsGuidsBefore,
    blankTargetStartBefore,
    blankTargetEndBefore,
    blankProjwbsGuidsAfter: 0,
    duplicateProjwbsGuidsAfter: 0,
    blankTargetStartAfter: 0,
    blankTargetEndAfter: 0,
    unresolvedTasksAfterRepair: 0,
  };

  const byWbsId = new Map<string, Record<string, string>>();
  for (const r of projwbsRows) {
    const id = (r.wbs_id ?? "").trim();
    if (id.length > 0) byWbsId.set(id, r);
  }

  const wbsPathById = new Map<string, string>();
  const pathOwners = new Map<string, string[]>();

  const memoPath = new Map<string, string>();
  const visiting = new Set<string>();

  function computePath(wbsId: string): string {
    if (memoPath.has(wbsId)) return memoPath.get(wbsId) ?? "";
    if (visiting.has(wbsId)) {
      throw new XerRepairValidationError(
        `PROJWBS hierarchy contains a cycle at wbs_id=${wbsId}.`,
      );
    }
    visiting.add(wbsId);
    const segments: string[] = [];
    let cur: string | null = wbsId;
    const chainVisited = new Set<string>();
    while (cur && !chainVisited.has(cur)) {
      chainVisited.add(cur);
      const row = byWbsId.get(cur);
      if (!row) break;
      segments.push(wbsSegment(row));
      const parent = normalizeParentId(row.parent_wbs_id);
      if (!parent || !byWbsId.has(parent)) break;
      cur = parent;
    }
    visiting.delete(wbsId);
    const wbsPath = segments.reverse().join(".");
    memoPath.set(wbsId, wbsPath);
    return wbsPath;
  }

  for (const r of projwbsRows) {
    const id = (r.wbs_id ?? "").trim();
    if (id.length === 0) continue;
    const p = computePath(id);
    wbsPathById.set(id, p);
    const owners = pathOwners.get(p) ?? [];
    owners.push(id);
    pathOwners.set(p, owners);
  }

  for (const [p, owners] of pathOwners) {
    if (owners.length > 1) {
      throw new XerRepairValidationError(
        `Duplicate WBS_PATH "${p}" for wbs_id values: ${owners.join(", ")}. Cannot assign unique GUIDs.`,
      );
    }
  }

  const guidByWbsId = new Map<string, string>();
  for (const r of projwbsRows) {
    const id = (r.wbs_id ?? "").trim();
    const wbsPath = id.length > 0 ? (wbsPathById.get(id) ?? "") : "";
    const guid = wbsPath.length > 0 ? guidForWbsPath(wbsPath) : "";
    if (id.length > 0 && guid.length > 0) {
      guidByWbsId.set(id, guid);
      r.guid = guid;
    }
  }

  counts.blankProjwbsGuidsAfter = projwbsRows.filter((r) =>
    isBlankGuid(r.guid),
  ).length;
  counts.duplicateProjwbsGuidsAfter = countDuplicateGuids(projwbsRows);

  const base = path.basename(resolvedSource, path.extname(resolvedSource));
  const sourceDir = path.dirname(resolvedSource);

  if (
    options.outputMapPath !== undefined &&
    options.outputXerPath === undefined
  ) {
    throw new XerRepairValidationError(
      "outputMapPath requires outputXerPath to be set.",
    );
  }

  const hasOutXer = options.outputXerPath !== undefined;
  const generateMap = options.generateMap === true;

  let outputDirectory: string;
  if (hasOutXer && options.outputXerPath) {
    outputDirectory = path.dirname(options.outputXerPath);
    fs.mkdirSync(outputDirectory, { recursive: true });
  } else {
    outputDirectory = path.join(sourceDir, FIXED_XER_DIR_NAME);
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const outXer =
    options.outputXerPath ?? path.join(outputDirectory, `${base}_fixed.xer`);

  const taskStats = await streamTransformXer(
    resolvedSource,
    outXer,
    eol,
    fileEndsWithNewline,
    guidByWbsId,
  );
  counts.blankTargetStartAfter = taskStats.blankTargetStartAfter;
  counts.blankTargetEndAfter = taskStats.blankTargetEndAfter;
  counts.unresolvedTasksAfterRepair = taskStats.unresolvedTasksAfterRepair;

  let outputMapPath: string | null = null;
  if (generateMap) {
    const outMap =
      options.outputMapPath ??
      path.join(outputDirectory, `${base} - WBS Path GUID Map.tsv`);
    const header = [
      "wbs_id",
      "parent_wbs_id",
      "wbs_path",
      "guid",
      "wbs_name",
    ].join("\t");
    const mapLines = [header];
    for (const r of projwbsRows) {
      const id = (r.wbs_id ?? "").trim();
      const parent = (r.parent_wbs_id ?? "").trim();
      const wbsPath = id.length > 0 ? (wbsPathById.get(id) ?? "") : "";
      const guid = (r.guid ?? "").trim();
      const wbsName = r.wbs_name ?? "";
      mapLines.push([id, parent, wbsPath, guid, wbsName].join("\t"));
    }
    fs.writeFileSync(outMap, mapLines.join(eol) + eol, "utf8");
    outputMapPath = outMap;
  }

  return {
    counts,
    outputDirectory,
    outputXerPath: outXer,
    outputMapPath,
    wbsPathById,
  };
}
