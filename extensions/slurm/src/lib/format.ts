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

function relativeFromNow(date: Date): string {
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
  if (total <= 0) return "0s";
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && total < 3600) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

function parseSlurmDurationSeconds(v: string): number | null {
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

function prettifyGpuModel(raw: string): string {
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
