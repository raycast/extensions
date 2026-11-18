import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { Buchung, buchungen, euro, SbFehlt } from "./sb";

/** Ein Monat in einer Währung. Mehr als eine Währung ergibt mehr als ein Bild. */
interface Monatsbild {
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  byCategory: { category: string; amount: number }[];
}

/** `YYYY-MM` des laufenden Monats — dasselbe Format wie das Buchungsdatum. */
function monatsSchluessel(heute = new Date()): string {
  return `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;
}

function monatsName(schluessel: string): string {
  const [jahr, monat] = schluessel.split("-").map(Number);
  return new Date(jahr, monat - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Wie viele Tage zurück geladen werden muss, damit der ganze Monat drin ist. Sieben Tage
 * Reserve, weil das Buchungsdatum mancher Bank ein paar Tage hinter dem Wertstellungstag liegt.
 */
function tageBisMonatsanfang(heute = new Date()): number {
  return heute.getDate() + 7;
}

/**
 * Rechnet den Monat **je Währung** aus den Buchungen zusammen.
 *
 * Eine einzige Summe über alle Konten wäre nur richtig, wenn alle Konten dieselbe Währung
 * führen. Ohne Umrechnungskurs — und den holt diese Erweiterung bewusst nicht — bleibt
 * jede Währung für sich. Im Normalfall (alles Euro) kommt genau ein Bild heraus.
 *
 * Die Regeln entsprechen `sb summary`: Ausgaben sind negative Beträge, Einnahmen positive,
 * Kategorien werden nur für Ausgaben gebildet.
 */
export function monatsbilder(alle: Buchung[], monat: string): Monatsbild[] {
  const jeWaehrung = new Map<string, Buchung[]>();
  for (const b of alle) {
    if (!b.date.startsWith(monat)) continue;
    const w = b.currency || "EUR";
    jeWaehrung.set(w, [...(jeWaehrung.get(w) ?? []), b]);
  }

  const bilder: Monatsbild[] = [];
  for (const [currency, posten] of jeWaehrung) {
    const kategorien = new Map<string, number>();
    let totalExpenses = 0;
    let totalIncome = 0;
    for (const b of posten) {
      if (b.amount < 0) {
        const key = b.category || "Uncategorized";
        kategorien.set(key, (kategorien.get(key) ?? 0) + Math.abs(b.amount));
        totalExpenses += Math.abs(b.amount);
      } else if (b.amount > 0) {
        totalIncome += b.amount;
      }
    }
    bilder.push({
      currency,
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      byCategory: [...kategorien.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ category, amount })),
    });
  }

  // Euro zuerst, dann nach Umsatzvolumen — damit die Hauptwährung oben steht.
  return bilder.sort((a, b) => {
    if (a.currency === "EUR" && b.currency !== "EUR") return -1;
    if (b.currency === "EUR" && a.currency !== "EUR") return 1;
    return b.totalIncome + b.totalExpenses - (a.totalIncome + a.totalExpenses);
  });
}

export default function Ausgaben() {
  const [bilder, setBilder] = useState<Monatsbild[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | undefined>();
  const monat = monatsSchluessel();

  useEffect(() => {
    buchungen(tageBisMonatsanfang())
      .then((b) => setBilder(monatsbilder(b, monat)))
      .catch((e) => setFehler(e instanceof SbFehlt ? e.message : String(e)))
      .finally(() => setLaedt(false));
  }, []);

  if (fehler) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="simplebanking Not Reachable"
          description={fehler}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download the App" url="https://www.simplebanking.de" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const mehrereWaehrungen = bilder.length > 1;
  const titel = (bild: Monatsbild) =>
    mehrereWaehrungen ? `${monatsName(monat)} · ${bild.currency}` : monatsName(monat);

  return (
    <List isLoading={laedt} searchBarPlaceholder="Search categories">
      {!laedt && bilder.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Transactions Yet"
          description={`Nothing booked in ${monatsName(monat)}.`}
        />
      )}
      {bilder.map((bild) => (
        <List.Section key={bild.currency} title={titel(bild)}>
          <List.Item
            icon={Icon.ArrowDown}
            title="Spending"
            accessories={[{ text: euro(bild.totalExpenses, bild.currency) }]}
          />
          <List.Item
            icon={Icon.ArrowUp}
            title="Income"
            accessories={[{ text: euro(bild.totalIncome, bild.currency) }]}
          />
          <List.Item
            icon={Icon.PlusMinusDivideMultiply}
            title="Net"
            accessories={[{ text: euro(bild.net, bild.currency) }]}
          />
        </List.Section>
      ))}
      {bilder.map((bild) => (
        <List.Section
          key={`${bild.currency}-categories`}
          title={mehrereWaehrungen ? `By Category · ${bild.currency}` : "By Category"}
        >
          {bild.byCategory.map((c) => (
            <List.Item
              key={`${bild.currency}-${c.category}`}
              icon={Icon.Tag}
              title={c.category}
              accessories={[{ text: euro(c.amount, bild.currency) }]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
