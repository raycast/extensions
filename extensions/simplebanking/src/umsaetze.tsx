import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Buchung, buchungen, Konto, konten, euro, summeJeWaehrung, SbFehlt } from "./sb";

/** Eine Buchung als Zeile zum Weitergeben. Konto hinten, weil vorne das Wichtige steht. */
function alsText(b: Buchung, kontoName: string): string {
  const teile = [b.date, b.merchant, euro(b.amount, b.currency)];
  if (b.category) teile.push(b.category);
  if (kontoName) teile.push(kontoName);
  return teile.join(" · ");
}

function anzahl(n: number): string {
  return `${n} ${n === 1 ? "transaction" : "transactions"}`;
}

/** Farbe nach Vorzeichen — und Grau, wenn es noch keinen Saldo gibt. */
function farbe(k: Konto): Color {
  if (k.balance == null) return Color.SecondaryText;
  return k.balance < 0 ? Color.Red : Color.Green;
}

/** Die Buchungen eines Kontos — oder aller, wenn `konto` fehlt. */
function Liste({ daten, namen, konto }: { daten: Buchung[]; namen: Map<string, string>; konto?: Konto }) {
  const sichtbar = konto ? daten.filter((b) => b.slotId === konto.slotId) : daten;
  const summe = summeJeWaehrung(sichtbar);
  const titel = konto ? konto.name : "All Accounts";

  return (
    <List navigationTitle={titel} searchBarPlaceholder="Search merchant or category">
      <List.Section title={titel} subtitle={`${sichtbar.length} · ${summe}`}>
        {sichtbar.map((b, i) => {
          const kontoName = namen.get(b.slotId) ?? "";
          return (
            <List.Item
              key={`${b.slotId}-${b.date}-${i}`}
              icon={b.status === "pending" ? Icon.Clock : Icon.Receipt}
              title={b.merchant}
              subtitle={b.category ?? undefined}
              accessories={[
                // Das Konto nur zeigen, solange nicht ohnehin danach gefiltert wird.
                ...(!konto && kontoName ? [{ tag: kontoName }] : []),
                { text: euro(b.amount, b.currency) },
                { text: b.date },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Transaction" content={alsText(b, kontoName)} />
                  <Action.CopyToClipboard
                    title="Copy Amount Only"
                    content={euro(b.amount, b.currency)}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Merchant Only"
                    content={b.merchant}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Umsaetze() {
  const [daten, setDaten] = useState<Buchung[]>([]);
  const [kontenListe, setKontenListe] = useState<Konto[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | undefined>();

  useEffect(() => {
    // Beides zusammen: Ohne die Kontenliste ließe sich weder auswählen noch anzeigen,
    // zu welchem Konto eine Buchung gehört.
    Promise.all([buchungen(30), konten()])
      .then(([b, k]) => {
        setDaten(b);
        setKontenListe(k);
      })
      .catch((e) => setFehler(e instanceof SbFehlt ? e.message : String(e)))
      .finally(() => setLaedt(false));
  }, []);

  const namen = useMemo(() => new Map(kontenListe.map((k) => [k.slotId, k.name])), [kontenListe]);

  const anzahlJeKonto = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of daten) m.set(b.slotId, (m.get(b.slotId) ?? 0) + 1);
    return m;
  }, [daten]);

  if (fehler) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="simplebanking Not Reachable" description={fehler} />
      </List>
    );
  }

  // Bei einem einzigen Konto wäre die Auswahl ein leerer Zwischenschritt — dann direkt
  // die Buchungen. Ansonsten dieselbe Kontenliste wie beim Kontostand.
  if (!laedt && kontenListe.length <= 1) {
    return <Liste daten={daten} namen={namen} />;
  }

  return (
    <List isLoading={laedt} searchBarPlaceholder="Search accounts">
      <List.Section title="Total">
        <List.Item
          icon={Icon.BankNote}
          title="All Accounts"
          accessories={[{ text: anzahl(daten.length) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Transactions"
                icon={Icon.Receipt}
                target={<Liste daten={daten} namen={namen} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Accounts">
        {kontenListe.map((k) => (
          <List.Item
            key={k.slotId}
            icon={{ source: Icon.Building, tintColor: farbe(k) }}
            title={k.name}
            subtitle={k.iban.slice(0, 8) + "…"}
            accessories={[{ text: anzahl(anzahlJeKonto.get(k.slotId) ?? 0) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Transactions"
                  icon={Icon.Receipt}
                  target={<Liste daten={daten} namen={namen} konto={k} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
