import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";

const run = promisify(execFile);

/**
 * Wo das `sb`-Binary liegt.
 *
 * Erst der Symlink, den simplebanking selbst anlegt (Einstellungen → Erweiterungen),
 * dann der Weg direkt ins App-Bundle. Der zweite Weg ist wichtig: Wer das CLI nie
 * installiert hat, soll die Erweiterung trotzdem benutzen können, ohne vorher etwas
 * einzurichten — sonst scheitert der erste Aufruf und niemand weiß, warum.
 */
const KANDIDATEN = [
  `${homedir()}/.local/bin/sb`,
  "/usr/local/bin/sb",
  "/Applications/simplebanking.app/Contents/MacOS/simplebanking-cli",
  `${homedir()}/Applications/simplebanking.app/Contents/MacOS/simplebanking-cli`,
];

export class SbFehlt extends Error {
  constructor() {
    super("simplebanking wurde nicht gefunden. Erwartet unter ~/.local/bin/sb oder in /Applications.");
  }
}

function pfad(): string {
  const treffer = KANDIDATEN.find((p) => existsSync(p));
  if (!treffer) throw new SbFehlt();
  return treffer;
}

/**
 * Ruft `sb <args> --json` auf.
 *
 * Alles hier ist lesend und geht an den lokalen Bestand — kein Bankabruf, keine TAN.
 * Einzige Ausnahme ist `refresh`, das bewusst einen eigenen Befehl hat.
 */
async function sb<T>(args: string[]): Promise<T> {
  const { stdout } = await run(pfad(), [...args, "--json"], {
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export interface Konto {
  slotId: string;
  name: string;
  iban: string;
  balance: number;
  currency: string;
}

export interface Buchung {
  slotId: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
}

export interface Uebersicht {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  byCategory: { category: string; amount: number }[];
}

export const konten = () => sb<Konto[]>(["balance"]);
export const buchungen = (tage: number) => sb<Buchung[]>(["tx", "--days", String(tage)]);
export const uebersicht = () => sb<Uebersicht>(["summary"]);

/** Der einzige Befehl, der die Bank anfragt — kann eine Freigabe verlangen. */
export async function aktualisieren(): Promise<void> {
  await run(pfad(), ["refresh"], { timeout: 120_000 });
}

/**
 * Summiert Beträge **je Währung** und stellt sie nebeneinander.
 *
 * Der Grund in einem Satz: 1.000 € + 1.000 $ sind nicht 2.000 €. Ohne Umrechnungskurs —
 * und den holt diese Erweiterung bewusst nicht — gibt es keine einzelne Zahl, die stimmt.
 * Im Normalfall (alles Euro) kommt genau ein Betrag heraus, es ändert sich also nichts.
 */
export function summeJeWaehrung(posten: { amount: number; currency: string }[]): string {
  const summen = new Map<string, number>();
  for (const p of posten) {
    const w = p.currency || "EUR";
    summen.set(w, (summen.get(w) ?? 0) + p.amount);
  }
  if (summen.size === 0) return euro(0);
  return [...summen.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([w, betrag]) => euro(betrag, w))
    .join(" · ");
}

/** Beträge einheitlich formatieren, damit Listen nicht zappeln. */
export function euro(betrag: number, waehrung = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: waehrung,
  }).format(betrag);
}
