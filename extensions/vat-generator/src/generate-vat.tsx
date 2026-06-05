import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { Country, COUNTRIES, generateVat } from "./lib/countries";

export default function Command() {
  // A counter that, when bumped, re-rolls every visible sample number.
  const [seed, setSeed] = useState(0);

  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);

  const grouped = useMemo(() => {
    const eu = sorted.filter((c) => c.region === "EU");
    const world = sorted.filter((c) => c.region === "World");
    return { eu, world };
  }, [sorted]);

  const regenerateAll = () => setSeed((s) => s + 1);

  return (
    <List searchBarPlaceholder="Search a country or VAT prefix (e.g. Germany, DE)...">
      <List.Section title="Actions">
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Refresh All"
          subtitle="Regenerate VAT numbers for every country"
          keywords={["refresh", "regenerate", "reload"]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh All"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={regenerateAll}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="European Union" subtitle={`${grouped.eu.length} countries`}>
        {grouped.eu.map((country) => (
          <CountryItem key={country.code} country={country} seed={seed} onRegenerateAll={regenerateAll} />
        ))}
      </List.Section>
      <List.Section title="Rest of the World" subtitle={`${grouped.world.length} countries`}>
        {grouped.world.map((country) => (
          <CountryItem key={country.code} country={country} seed={seed} onRegenerateAll={regenerateAll} />
        ))}
      </List.Section>
    </List>
  );
}

function CountryItem({
  country,
  seed,
  onRegenerateAll,
}: {
  country: Country;
  seed: number;
  onRegenerateAll: () => void;
}) {
  // Local nonce lets a single item regenerate without touching the others.
  const [nonce, setNonce] = useState(0);
  const value = useMemo(() => generateVat(country), [country, seed, nonce]);

  const variants = useMemo(
    () => Array.from({ length: 5 }, () => generateVat(country)).join("\n"),
    [country, seed, nonce],
  );

  const isChecksum = country.tier === "checksum";
  const tierAccessory: List.Item.Accessory = isChecksum
    ? { tag: { value: "checksum", color: Color.Green }, tooltip: "Passes the country's check-digit algorithm" }
    : { tag: { value: "format", color: Color.SecondaryText }, tooltip: "Matches length/pattern only" };

  return (
    <List.Item
      icon={country.flag}
      title={country.name}
      subtitle={value}
      keywords={[country.code, country.prefix, country.format]}
      accessories={[{ text: country.format }, tierAccessory]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Vat Number" content={value} icon={Icon.Clipboard} />
            <Action.Paste title="Paste to Active App" content={value} icon={Icon.Text} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Regenerate This Number"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setNonce((n) => n + 1)}
            />
            <Action
              title="Regenerate All"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={onRegenerateAll}
            />
            <Action.CopyToClipboard
              title="Copy 5 Variants"
              content={variants}
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
