import fs from "node:fs";
import path from "node:path";
import { getBuildRoot } from "./config";

// result.json schema(与 scripts/lib/common.sh::result_init 严格对应)
// 任何 schema 变更只在 shell 侧发生,此处只消费。

export type StageStatus = "pending" | "ok" | "warn" | "failed" | "skipped";
export type FinalStatus = "pending" | "ok" | "ok_with_warn" | "failed" | "dry_run";

export interface StageEntry {
  name: string;
  status: StageStatus;
  exit_code: number;
  duration_sec: number;
  log: string;
  summary: string;
  message: string;
}

export interface ReleaseFields {
  app_version: string;
  build_number: number;
  bundle_id: string;
  api_environment: string;
  app_id: string;
  app_name: string;
  primary_locale: string;
  archive_size: string;
  ipa_size: string;
  build_id: string;
  delivery_uuid: string;
  retry_count: number;
}

export interface ResultJson {
  ts: string;
  dry_run: boolean;
  stage_requested: string;
  started_at: string;
  last_started_at?: string;
  finished_at: string;
  final_status: FinalStatus;
  log_dir: string;
  stages: StageEntry[];
  release: ReleaseFields;
}

const TS_PATTERN = /^\d{8}_\d{6}$/;

export function findLatestTsDir(): string | null {
  try {
    const buildRoot = getBuildRoot();
    if (!buildRoot || !fs.existsSync(buildRoot)) return null;
    const entries = fs
      .readdirSync(buildRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && TS_PATTERN.test(d.name))
      .map((d) => d.name)
      .sort()
      .reverse();
    return entries[0] ?? null;
  } catch {
    return null;
  }
}

export function readResultJson(ts: string): ResultJson | null {
  const p = path.join(getBuildRoot(), ts, "result.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as ResultJson;
  } catch {
    return null;
  }
}

// 读取某 stage 的 summary.txt。严禁读 .log 文件(契约约束)。
export function readSummaryText(ts: string, summaryFile: string): string | null {
  if (!summaryFile.endsWith(".summary.txt")) return null;
  const p = path.join(getBuildRoot(), ts, summaryFile);
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function absLogDir(ts: string): string {
  return path.join(getBuildRoot(), ts);
}

export function absResultJsonPath(ts: string): string {
  return path.join(getBuildRoot(), ts, "result.json");
}

// 在结果视图里拿 TS:优先用户传入 --ts,否则找最新目录。
// 注意:sync stage 不产生 TS 目录,UI 层必须在调用前自行判断,不要在 sync 场景调用本函数。
export function resolveTs(explicitTs: string | undefined): string | null {
  if (explicitTs && explicitTs.trim()) return explicitTs.trim();
  return findLatestTsDir();
}
