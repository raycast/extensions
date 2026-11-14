import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";

/**
 * Resumo enxuto gravado pelo comando de janela e lido pelo comando de barra.
 *
 * A barra roda de 10 em 10 minutos; ela nao pode pagar o custo de abrir o cache
 * completo de uso so para mostrar dois numeros.
 */

export type UsageSummary = {
  updatedAt: number;
  today: { tokens: number; cost: number };
  week: { tokens: number; cost: number };
  all: { tokens: number; cost: number };
};

function file(): string {
  return path.join(environment.supportPath, "summary.json");
}

export async function writeSummary(s: UsageSummary): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(file(), JSON.stringify(s), "utf8");
}

export async function readSummary(): Promise<UsageSummary | null> {
  try {
    return JSON.parse(await readFile(file(), "utf8")) as UsageSummary;
  } catch {
    return null;
  }
}
