import { Color } from "@raycast/api";

export const STATE_COLORS: Record<string, Color> = {
  RUNNING: Color.Green,
  PENDING: Color.Yellow,
  COMPLETING: Color.Purple,
  COMPLETED: Color.Blue,
  CANCELLED: Color.SecondaryText,
  FAILED: Color.Red,
  TIMEOUT: Color.Red,
  PREEMPTED: Color.Orange,
  SUSPENDED: Color.Orange,
  CONFIGURING: Color.Yellow,
};

export function stateColor(state: string): Color {
  return STATE_COLORS[state] ?? Color.SecondaryText;
}

// Parse a Slurm ISO datetime ("2025-06-10T14:23:45") into a Date. Returns null
// for empty / sentinel values ("Unknown", "N/A", "None") or anything unparseable.
export function parseSlurmDateTime(s: string): Date | null {
  const v = (s ?? "").trim();
  if (!v || v === "Unknown" || v === "N/A" || v === "None") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSlurmDateTime(s: string): string {
  const v = (s ?? "").trim();
  if (!v || v === "Unknown" || v === "N/A" || v === "None") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(v);
  if (!m) return v;
  const [, y, mo, d, hh, mm, ss] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  if (Number.isNaN(date.getTime())) return v;
  const absolute = date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${absolute} (${relativeFromNow(date)})`;
}

// Compact datetime for metadata label values: "Tue 14:25" when it falls on
// today, otherwise "Tue Jun 13, 14:25". Returns "—" for empty/sentinel values.
export function formatShortDateTime(s: string): string {
  const date = parseSlurmDateTime(s);
  return date ? formatShortDateTimeFor(date) : "—";
}

function formatShortDateTimeFor(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const time = date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const weekday = date.toLocaleString("en-US", { weekday: "short" });
  if (sameDay) return `${weekday} ${time}`;
  const day = date.toLocaleString("en-US", { day: "numeric", month: "short" });
  return `${weekday} ${day}, ${time}`;
}

export function relativeFromNow(date: Date): string {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const future = diffSec >= 0;
  const abs = Math.abs(diffSec);
  const phrase = phraseForSeconds(abs);
  if (phrase === "just now") return phrase;
  return future ? `in ${phrase}` : `${phrase} ago`;
}

function phraseForSeconds(sec: number): string {
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86_400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (sec < 7 * 86_400) {
    const d = Math.floor(sec / 86_400);
    const h = Math.floor((sec % 86_400) / 3600);
    return h ? `${d}d ${h}h` : `${d}d`;
  }
  if (sec < 365 * 86_400) {
    return `${Math.floor(sec / (30 * 86_400))} mo`;
  }
  return `${Math.floor(sec / (365 * 86_400))} y`;
}

export function formatSlurmDuration(s: string): string {
  const v = (s ?? "").trim();
  if (!v) return "—";
  if (v.toUpperCase() === "UNLIMITED") return "unlimited";
  const total = parseSlurmDurationSeconds(v);
  if (total == null) return v;
  return formatDurationSeconds(total);
}

// Human-readable duration from a raw second count, e.g. 8045 → "2h 14m".
// Seconds are only shown for sub-hour durations, matching formatSlurmDuration.
export function formatDurationSeconds(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0s";
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && total < 3600) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

export function parseSlurmDurationSeconds(v: string): number | null {
  const dashSplit = v.split("-");
  let days = 0;
  let rest = v;
  if (dashSplit.length === 2) {
    const d = Number(dashSplit[0]);
    if (!Number.isFinite(d)) return null;
    days = d;
    rest = dashSplit[1];
  }
  const parts = rest.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  let h = 0;
  let m = 0;
  let s = 0;
  if (dashSplit.length === 2) {
    if (parts.length === 3) [h, m, s] = parts;
    else if (parts.length === 2) [h, m] = parts;
    else return null;
  } else if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [m, s] = parts;
  } else {
    return null;
  }
  return days * 86_400 + h * 3600 + m * 60 + s;
}

// Unicode meter for metadata label values, e.g. "████░░░░░░░░". `fraction` is
// clamped to [0,1]; `width` is the segment count.
export function progressBar(fraction: number, width = 12): string {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const filled = Math.round(f * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export type JobTimeInfo = {
  elapsedSec: number | null;
  limitSec: number | null; // null = UNLIMITED / unknown
  remainingSec: number | null; // running + limited only
  progress: number | null; // 0..1, limited + elapsed known
  submitted: string; // formatted short datetime + relative
  started: string;
  ends: string; // actual EndTime, or projected (StartTime + TimeLimit) for running jobs
};

// Derive the time facts the detail view renders from scontrol fields. Pure
// (takes `nowMs`) so the 1 Hz re-render keeps elapsed/remaining ticking. `state`
// gates running-only figures (remaining, projected end).
export function buildJobTime(fields: Record<string, string>, nowMs: number): JobTimeInfo {
  const running = (fields.JobState ?? "").toUpperCase().startsWith("RUNNING");
  const start = parseSlurmDateTime(fields.StartTime ?? "");
  const end = parseSlurmDateTime(fields.EndTime ?? "");
  const limitSec =
    (fields.TimeLimit ?? "").trim().toUpperCase() === "UNLIMITED"
      ? null
      : parseSlurmDurationSeconds(fields.TimeLimit ?? "");

  let elapsedSec: number | null = null;
  if (start) {
    if (running) elapsedSec = Math.max(0, Math.round((nowMs - start.getTime()) / 1000));
    else if (end) elapsedSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  }

  const remainingSec = running && limitSec != null && elapsedSec != null ? Math.max(0, limitSec - elapsedSec) : null;
  const progress =
    limitSec != null && limitSec > 0 && elapsedSec != null ? Math.max(0, Math.min(1, elapsedSec / limitSec)) : null;

  // For a running job scontrol's EndTime is the projected end; fall back to
  // StartTime + TimeLimit if it's missing.
  const endsDate = end ?? (running && start && limitSec != null ? new Date(start.getTime() + limitSec * 1000) : null);

  return {
    elapsedSec,
    limitSec,
    remainingSec,
    progress,
    submitted: withRelative(fields.SubmitTime ?? ""),
    started: withRelative(fields.StartTime ?? ""),
    ends: endsDate ? `${formatShortDateTimeFor(endsDate)} · ${relativeFromNow(endsDate)}` : "—",
  };
}

function withRelative(s: string): string {
  const date = parseSlurmDateTime(s);
  if (!date) return "—";
  return `${formatShortDateTimeFor(date)} · ${relativeFromNow(date)}`;
}

export function formatBytesMB(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return "0 MB";
  if (mb >= 1024 * 1024) return `${(mb / (1024 * 1024)).toFixed(1)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatPercent(num: number, den: number): string {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

// Raycast lays out a List.Item as: icon + title + subtitle on the left, and
// accessories on the right. The subtitle (we use it for the job name) is the
// element Raycast lets overflow — the title and accessories keep their space,
// so a long job name shoves accessories (e.g. the GPU tag) off the right edge.
// Raycast exposes no row width or resize hook, so we can't measure pixels; we
// instead give the name whatever character budget the row has left after the
// title + accessories (which are right-bounded) take their share. Names that
// fit keep their full text; only names that would actually overflow get an
// ellipsis — so the name grows and shrinks with the rest of the row. ROW_CHAR_-
// BUDGET approximates the default Raycast window's content width: raise it if
// names look over-truncated, lower it if accessories still get clipped.
//
// ACCESSORY_PADDING reserves slack around every right-bounded chip so the name
// (and only the name) absorbs any shortfall — in particular the variable-width
// "elapsed / timeLimit" chip must never be the element that gets ellipsized.
const ROW_CHAR_BUDGET = 112;
const ACCESSORY_PADDING = 6; // per-element gap/slack Raycast adds around each chip

export function fitSubtitleToRow(name: string, rowTexts: string[]): string {
  const used = rowTexts.reduce((n, t) => n + t.length + ACCESSORY_PADDING, 0);
  const max = Math.max(6, ROW_CHAR_BUDGET - used);
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function shortReason(reason: string | undefined): string {
  if (!reason || reason === "None") return "";
  return reason;
}

export function gpuCountFromGres(gres: string): number {
  // gres examples: "gpu:a100:4(S:0-1)", "gpu:8", "gpu:rtx2080ti:2", "(null)"
  if (!gres || gres === "(null)") return 0;
  const m = /(?:^|,)gpu(?::[^:,(]+)?:(\d+)/.exec(gres);
  return m ? Number(m[1]) : 0;
}

export function gpuCountFromTres(tres: string): number {
  // AllocTRES/CfgTRES examples: "cpu=16,mem=128G,gres/gpu=2", "cpu=64,gres/gpu:a100=4"
  if (!tres || tres === "(null)") return 0;
  const m = /gres\/gpu(?::[^=,]+)?=(\d+)/.exec(tres);
  return m ? Number(m[1]) : 0;
}

export function memFromTres(tres: string): string | null {
  if (!tres || tres === "N/A" || tres === "(null)") return null;
  const m = /(?:^|,)mem=(\d+)([TGMK]?)/i.exec(tres);
  if (!m) return null;
  const val = Number(m[1]);
  const unit = (m[2] ?? "").toUpperCase();
  if (unit === "M" || unit === "") {
    const gb = val / 1024;
    return gb >= 1 ? `${Number.isInteger(gb) ? gb : gb.toFixed(1)}G` : `${val}M`;
  }
  return `${val}${unit || "M"}`;
}

export function gpuLabelFromTres(tres: string): string | null {
  if (!tres || tres === "N/A" || tres === "(null)") return null;
  // Prefer typed TRES form: "gres/gpu:a100=2", "gres/gpu:rtx_pro_6000=1".
  // AllocTRES typically contains BOTH "gres/gpu=N" and "gres/gpu:<model>=N",
  // so we scan for the typed form first to surface the model name.
  const typedM = /gres\/gpu:([^=,]+)=(\d+)/.exec(tres);
  if (typedM) {
    const count = Number(typedM[2]);
    if (!count) return null;
    return `${count}×${prettifyGpuModel(typedM[1])}`;
  }
  // Generic TRES form: "gres/gpu=2".
  const genericM = /gres\/gpu=(\d+)/.exec(tres);
  if (genericM) {
    const count = Number(genericM[1]);
    if (!count) return null;
    return `${count} GPU`;
  }
  // GRES format (legacy / squeue %b): "gpu:a100:2", "gpu:8".
  const gresM = /(?:^|,)gpu(?::([^:,(]+))?:(\d+)/.exec(tres);
  if (gresM) {
    const count = Number(gresM[2]);
    if (!count) return null;
    return gresM[1] ? `${count}×${prettifyGpuModel(gresM[1])}` : `${count} GPU`;
  }
  return null;
}

// Count + raw gres type token for a job's allocated GPUs, e.g.
// "cpu=64,gres/gpu:rtx_pro_6000=4" → { count: 4, type: "rtx_pro_6000" }.
// `type` is the lowercase Slurm token (feed it to prettifyGpuModel for display
// and gpuVramGb for VRAM); it is null for the generic "gres/gpu=N" form.
export function gpuInfoFromTres(tres: string): { count: number; type: string | null } | null {
  if (!tres || tres === "N/A" || tres === "(null)") return null;
  const typedM = /gres\/gpu:([^=,]+)=(\d+)/.exec(tres);
  if (typedM) {
    const count = Number(typedM[2]);
    return count ? { count, type: typedM[1] } : null;
  }
  const genericM = /gres\/gpu=(\d+)/.exec(tres);
  if (genericM) {
    const count = Number(genericM[1]);
    return count ? { count, type: null } : null;
  }
  const gresM = /(?:^|,)gpu(?::([^:,(]+))?:(\d+)/.exec(tres);
  if (gresM) {
    const count = Number(gresM[2]);
    return count ? { count, type: gresM[1] ?? null } : null;
  }
  return null;
}

export function prettifyGpuModel(raw: string): string {
  // Slurm gres types are lowercase with underscores (e.g. "rtx_pro_6000",
  // "a100", "h200"). Replace underscores with spaces and uppercase the first
  // character of each token for readability.
  return raw
    .split("_")
    .map((t) => (t.length ? t[0].toUpperCase() + t.slice(1) : t))
    .join(" ");
}

export function gpuModelFromGres(gres: string, features: string): string {
  if (!gres || gres === "(null)") return "";
  const m = /(?:^|,)gpu:([^:,(]+):\d+/.exec(gres);
  if (m) return m[1];
  // fall back to features for the model name
  const featTokens = features.split(",").map((t) => t.trim().toLowerCase());
  const guesses = ["a100", "h100", "v100", "a40", "rtx3090", "rtx2080ti"];
  for (const g of guesses) {
    if (featTokens.includes(g)) return g;
  }
  return "gpu";
}
