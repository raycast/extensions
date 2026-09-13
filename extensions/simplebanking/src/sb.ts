import { getApplications } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";

const run = promisify(execFile);

/** Die Bundle-ID der App — darüber findet LaunchServices sie, egal wo sie liegt. */
const BUNDLE_ID = "tech.yaxi.simplebanking";

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
    super("simplebanking is not installed, or it could not be located. Get it at simplebanking.de, then try again.");
  }
}

/** Einmal gefunden, bleibt der Pfad für die Lebensdauer des Befehls. */
let gemerkt: string | undefined;

/** Das CLI im Bundle — oder nichts, wenn es dort nicht liegt. */
function cliIm(appPfad: string): string | undefined {
  const cli = `${appPfad.replace(/\/$/, "")}/Contents/MacOS/simplebanking-cli`;
  return existsSync(cli) ? cli : undefined;
}

/**
 * Fragt LaunchServices nach dem Ort der App.
 *
 * `path to application id` ist dieselbe Auskunft, die der Finder benutzt, und sie kennt
 * jede App, die auf diesem Mac schon einmal geöffnet wurde — unabhängig davon, wo sie
 * liegt und ob sie gerade läuft. Kein Shell, feste Argumente; scheitert es, bleibt es
 * beim Ergebnis der anderen Wege.
 */
async function ueberLaunchServices(): Promise<string | undefined> {
  try {
    const { stdout } = await run(
      "/usr/bin/osascript",
      ["-e", `POSIX path of (path to application id "${BUNDLE_ID}")`],
      {
        timeout: 10_000,
      },
    );
    return cliIm(stdout.trim());
  } catch {
    return undefined;
  }
}

/**
 * Findet das CLI.
 *
 * Die festen Pfade decken den Normalfall ab. Liegt die App woanders — umbenannt, in
 * einem Unterordner, aus dem Build-Verzeichnis gestartet —, fragen die nächsten Schritte
 * Raycast und dann LaunchServices nach der Bundle-ID.
 */
async function pfad(): Promise<string> {
  if (gemerkt) return gemerkt;

  const fest = KANDIDATEN.find((p) => existsSync(p));
  if (fest) return (gemerkt = fest);

  for (const app of await getApplications()) {
    if (app.bundleId !== BUNDLE_ID) continue;
    const cli = cliIm(app.path);
    if (cli) return (gemerkt = cli);
  }

  const registriert = await ueberLaunchServices();
  if (registriert) return (gemerkt = registriert);

  throw new SbFehlt();
}

/**
 * Ruft `sb <args> --json` auf.
 *
 * Alles hier ist lesend und geht an den lokalen Bestand — kein Bankabruf, keine TAN.
 * Einzige Ausnahme ist `refresh`, das bewusst einen eigenen Befehl hat.
 */
async function sb<T>(args: string[]): Promise<T> {
  const { stdout } = await run(await pfad(), [...args, "--json"], {
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export interface Konto {
  slotId: string;
  name: string;
  iban: string;
  /** Fehlt, solange die App für dieses Konto noch keinen Saldo abgerufen hat. */
  balance?: number | null;
  currency: string;
}

export interface Buchung {
  slotId: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string | null;
  status: string;
}

export const konten = () => sb<Konto[]>(["balance"]);
export const buchungen = (tage: number) => sb<Buchung[]>(["tx", "--days", String(tage)]);

/**
 * Der einzige Befehl, der die Bank anfragt — kann eine Freigabe verlangen.
 *
 * Bewusst ohne eigenes Zeitlimit: Das CLI wartet selbst höchstens 180 Sekunden auf die
 * App und meldet dann einen Fehler. Ein zweites, kürzeres Limit hier würde eine laufende
 * TAN-Freigabe abbrechen und den Abruf als gescheitert melden, obwohl er noch läuft.
 */
export async function aktualisieren(): Promise<void> {
  await run(await pfad(), ["refresh"]);
}

/** Text für einen Betrag, der nicht vorliegt — in Listen wie in kopiertem Text. */
export const NICHT_VERFUEGBAR = "Not Available";

/** Ein Betrag, der auch fehlen darf: fehlt er, kommt kein `NaN €`, sondern ein Wort. */
export function betragOderHinweis(betrag: number | null | undefined, waehrung = "EUR"): string {
  return betrag == null ? NICHT_VERFUEGBAR : euro(betrag, waehrung);
}

/**
 * Summiert Beträge **je Währung** und stellt sie nebeneinander.
 *
 * Der Grund in einem Satz: 1.000 € + 1.000 $ sind nicht 2.000 €. Ohne Umrechnungskurs —
 * und den holt diese Erweiterung bewusst nicht — gibt es keine einzelne Zahl, die stimmt.
 * Im Normalfall (alles Euro) kommt genau ein Betrag heraus, es ändert sich also nichts.
 *
 * Posten ohne Betrag werden übergangen, nicht als 0 gezählt: Eine Summe, in der ein Konto
 * stillschweigend fehlt, wäre eine falsche Zahl. Fehlt jeder Betrag, gibt es keine Summe.
 */
export function summeJeWaehrung(posten: { amount?: number | null; currency: string }[]): string {
  const summen = new Map<string, number>();
  for (const p of posten) {
    if (p.amount == null) continue;
    const w = p.currency || "EUR";
    summen.set(w, (summen.get(w) ?? 0) + p.amount);
  }
  if (summen.size === 0) return posten.length === 0 ? euro(0) : NICHT_VERFUEGBAR;
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
