import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { Konto, konten, betragOderHinweis, summeJeWaehrung, SbFehlt } from "./sb";

/** Eine Zeile zum Weitergeben: Konto, IBAN, Saldo — in dieser Reihenfolge lesbar. */
function alsText(k: Konto): string {
  return `${k.name} · ${k.iban} · ${betragOderHinweis(k.balance, k.currency)}`;
}

/** Farbe nach Vorzeichen — und Grau, wenn es noch keinen Saldo gibt. */
function farbe(k: Konto): Color {
  if (k.balance == null) return Color.SecondaryText;
  return k.balance < 0 ? Color.Red : Color.Green;
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
        <List.EmptyView icon={Icon.ExclamationMark} title="simplebanking Not Reachable" description={fehler} />
      </List>
    );
  }

  const summe = summeJeWaehrung(daten.map((k) => ({ amount: k.balance, currency: k.currency })));
  const ohneSaldo = daten.filter((k) => k.balance == null).length;
  const summeHinweis =
    ohneSaldo === 0 ? undefined : `${ohneSaldo} ${ohneSaldo === 1 ? "account" : "accounts"} without a cached balance`;

  return (
    <List isLoading={laedt} searchBarPlaceholder="Search accounts">
      {daten.length > 1 && (
        <List.Section title="Total">
          <List.Item
            icon={Icon.BankNote}
            title="All Accounts"
            subtitle={summeHinweis}
            accessories={[{ text: summe }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Overview" content={daten.map(alsText).join("\n")} />
                <Action.CopyToClipboard title="Copy Total" content={summe} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Accounts">
        {daten.map((k) => (
          <List.Item
            key={k.slotId}
            icon={{ source: Icon.Building, tintColor: farbe(k) }}
            title={k.name}
            subtitle={k.iban.slice(0, 8) + "…"}
            accessories={[{ text: betragOderHinweis(k.balance, k.currency) }]}
            actions={
              <ActionPanel>
                {/* Return kopiert die ganze Zeile — das ist, was man weitergibt. */}
                <Action.CopyToClipboard title="Copy Account Details" content={alsText(k)} />
                <Action.CopyToClipboard
                  // IBAN ist ein Akronym, kein Wort — die Title-Case-Regel wüsste das nicht.
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Copy IBAN"
                  content={k.iban}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.CopyToClipboard
                  title="Copy Balance Only"
                  content={betragOderHinweis(k.balance, k.currency)}
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
