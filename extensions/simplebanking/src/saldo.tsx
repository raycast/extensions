import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { Konto, konten, euro, summeJeWaehrung, SbFehlt } from "./sb";

/** Eine Zeile zum Weitergeben: Konto, IBAN, Saldo — in dieser Reihenfolge lesbar. */
function alsText(k: Konto): string {
  return `${k.name} · ${k.iban} · ${euro(k.balance, k.currency)}`;
}

export default function Saldo() {
  const [daten, setDaten] = useState<Konto[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | undefined>();

  useEffect(() => {
    konten()
      .then(setDaten)
      .catch((e) => setFehler(e instanceof SbFehlt ? e.message : String(e)))
      .finally(() => setLaedt(false));
  }, []);

  if (fehler) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Nicht erreichbar" description={fehler} />
      </List>
    );
  }

  const summe = summeJeWaehrung(daten.map((k) => ({ amount: k.balance, currency: k.currency })));

  return (
    <List isLoading={laedt} searchBarPlaceholder="Konto suchen">
      {daten.length > 1 && (
        <List.Section title="Gesamt">
          <List.Item
            icon={Icon.BankNote}
            title="Alle Konten"
            accessories={[{ text: summe }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Übersicht Kopieren" content={daten.map(alsText).join("\n")} />
                <Action.CopyToClipboard title="Summe Kopieren" content={summe} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Konten">
        {daten.map((k) => (
          <List.Item
            key={k.slotId}
            icon={{
              source: Icon.Building,
              tintColor: k.balance < 0 ? Color.Red : Color.Green,
            }}
            title={k.name}
            subtitle={k.iban.slice(0, 8) + "…"}
            accessories={[{ text: euro(k.balance, k.currency) }]}
            actions={
              <ActionPanel>
                {/* Return kopiert die ganze Zeile — das ist, was man weitergibt. */}
                <Action.CopyToClipboard title="Kontodaten Kopieren" content={alsText(k)} />
                <Action.CopyToClipboard
                  title="IBAN Kopieren"
                  content={k.iban}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.CopyToClipboard
                  title="Nur Saldo Kopieren"
                  content={euro(k.balance, k.currency)}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
