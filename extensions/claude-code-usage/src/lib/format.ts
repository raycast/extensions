import { preferences } from "./paths";

export function tokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return String(n);
}

export function exact(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Custo em USD nos precos de lista; converte para BRL se o usuario pediu. */
export function money(usd: number): string {
  const prefs = preferences();
  if (prefs.currency === "BRL") {
    const rate = Number(String(prefs.usdToBrl ?? "5.40").replace(",", ".")) || 5.4;
    return `R$ ${(usd * rate).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$ ${usd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Barra de progresso em blocos, para ler o percentual sem interpretar numero. */
export function bar(percent: number, width = 12): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function untilReset(resetsAt: Date | null): string {
  if (!resetsAt) return "sem data de reinicio";
  const ms = resetsAt.getTime() - Date.now();
  if (ms <= 0) return "reiniciado";
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `reinicia em ${days}d ${hours % 24}h`;
  if (hours >= 1) return `reinicia em ${hours}h ${minutes % 60}min`;
  return `reinicia em ${minutes}min`;
}

export function ageOf(date: Date | null): string {
  if (!date) return "nunca lido";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  return `ha ${Math.floor(hours / 24)}d`;
}

export function dayLabel(day: string): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (day === iso(today)) return "Hoje";
  if (day === iso(yesterday)) return "Ontem";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}
