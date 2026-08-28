import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Uebersicht, uebersicht, euro, SbFehlt } from "./sb";

export default function Ausgaben() {
  const [daten, setDaten] = useState<Uebersicht | undefined>();
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | undefined>();

  useEffect(() => {
    uebersicht()
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

  return (
    <List isLoading={laedt} searchBarPlaceholder="Kategorie suchen">
      {daten && (
        <List.Section title={daten.month}>
          <List.Item
            icon={Icon.ArrowDown}
            title="Ausgaben"
            accessories={[{ text: euro(daten.totalExpenses) }]}
          />
          <List.Item
            icon={Icon.ArrowUp}
            title="Einnahmen"
            accessories={[{ text: euro(daten.totalIncome) }]}
          />
          <List.Item
            icon={Icon.PlusMinusDivideMultiply}
            title="Saldo"
            accessories={[{ text: euro(daten.net) }]}
          />
        </List.Section>
      )}
      <List.Section title="Nach Kategorie">
        {(daten?.byCategory ?? []).map((c) => (
          <List.Item
            key={c.category}
            icon={Icon.Tag}
            title={c.category}
            accessories={[{ text: euro(c.amount) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
