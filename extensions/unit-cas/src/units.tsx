import { Action, ActionPanel, List } from "@raycast/api";
import { UNITS, UnitDef, texUnit } from "./engine";
import { floatParts } from "./engine/format";
import { toF } from "./engine/num";

function factorText(u: UnitDef): string {
  const f = floatParts(toF(u.factor), 8);
  const num = f.mant + (f.exp !== null ? `ᴇ${f.exp}` : "");
  const dims = ["m", "kg", "s", "A", "K", "mol", "cd"]
    .map((n, i) => [n, u.dim[i]] as const)
    .filter(([, e]) => e !== 0)
    .map(([n, e]) => (e === 1 ? `_${n}` : `_${n}^${e}`))
    .join("*");
  return dims ? `${num} ${dims}` : num;
}

export default function Command() {
  const categories = [...new Set(UNITS.map((u) => u.category))];
  return (
    <List searchBarPlaceholder="Search units and constants…">
      {categories.map((cat) => (
        <List.Section key={cat} title={cat}>
          {UNITS.filter((u) => u.category === cat).map((u) => (
            <List.Item
              key={u.nspire}
              title={`_${u.nspire}`}
              subtitle={u.desc}
              keywords={[u.desc, u.nspire, u.tex, ...(u.aliases ?? [])]}
              accessories={[{ text: factorText(u) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy TI-Nspire Unit" content={`_${u.nspire}`} />
                  <Action.CopyToClipboard title="Copy LaTeX Unit" content={texUnit(u.nspire)} />
                  <Action.Paste title="Paste TI-Nspire Unit" content={`_${u.nspire}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
