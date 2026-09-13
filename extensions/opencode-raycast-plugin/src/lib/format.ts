import type { Modality } from "./types";

export function moneyPerMillion(v: number): string {
  if (v === 0) return "$0/M";
  const decimals = v < 0.1 ? 3 : 2;
  return `$${v.toFixed(decimals).replace(/\.?0+$/, "")}/M`;
}

export function modalityText(mod: Modality | null): string {
  if (!mod) return "modality unknown";
  const fmt = (list: string[]) => (list.length ? list.join(", ") : "—");
  return `in ${fmt(mod.input)} · out ${fmt(mod.output)}`;
}

export function percentText(p: number): string {
  return `${p}%`;
}

export function countdown(resetsAt: string, now: Date): string {
  const diffMs = new Date(resetsAt).getTime() - now.getTime();
  if (diffMs <= 0) return "resets now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `resets in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24)
    return `resets in ${hours}h${remMinutes ? ` ${remMinutes}m` : ""}`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `resets in ${days}d ${remHours}h`;
}
