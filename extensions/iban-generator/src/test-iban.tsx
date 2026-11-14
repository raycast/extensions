import { Action, ActionPanel, Clipboard, Color, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { toSavedIban } from "./generate-record";
import { loadFormPrefs } from "./form-prefs";
import { checkIban, formatIban, getCountry, parseIban, PROVIDER_TEST_IBANS, type ProviderTestIban } from "./lib";
import { outcomeColor, outcomeIcon } from "./provider-ui";
import { ibanText, saveIban, type IbanFormat, type SavedIban } from "./storage";

const ALL_PROVIDERS = "__all_providers__";

const NATIONAL_CHECK_ACCESSORY_TOOLTIP =
  "This IBAN passes the IBAN checksum but fails national check digits. Strict validators may reject it before your app talks to the provider.";

function groupedIban(iban: string): string {
  try {
    return formatIban(iban);
  } catch {
    return iban.replace(/(.{4})/g, "$1 ").trim();
  }
}

async function buildSavedFromEntry(entry: ProviderTestIban, format: IbanFormat): Promise<SavedIban> {
  const note = `${entry.provider} · ${entry.label}`;
  try {
    const parsed = parseIban(entry.iban);
    return toSavedIban(parsed, format, { note });
  } catch {
    const country = getCountry(entry.countryCode);
    return {
      iban: entry.iban,
      formatted: groupedIban(entry.iban),
      countryCode: entry.countryCode,
      countryName: country?.name ?? entry.countryCode,
      flag: country?.flag ?? "🏳️",
      sepa: country?.sepa ?? false,
      checkDigits: entry.iban.length >= 4 ? entry.iban.slice(2, 4) : "00",
      bban: entry.iban.length > 4 ? entry.iban.slice(4) : "",
      bankCode: "—",
      accountNumber: "—",
      format,
      savedAt: new Date().toISOString(),
      note,
    };
  }
}

function ProviderFilterDropdown({
  providers,
  value,
  onChange,
}: {
  providers: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter by provider" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All providers" value={ALL_PROVIDERS} icon={Icon.Layers} />
      {providers.map((provider) => (
        <List.Dropdown.Item key={provider} title={provider} value={provider} icon={Icon.Building} />
      ))}
    </List.Dropdown>
  );
}

function buildSections(entries: ProviderTestIban[]) {
  const groups = new Map<string, { provider: string; countryName: string; items: ProviderTestIban[] }>();

  for (const entry of entries) {
    const country = getCountry(entry.countryCode);
    const countryName = country?.name ?? entry.countryCode;
    const groupKey = `${entry.provider}\0${countryName}`;
    const group = groups.get(groupKey) ?? { provider: entry.provider, countryName, items: [] };
    group.items.push(entry);
    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.countryName.localeCompare(b.countryName))
    .map((group) => ({
      title: `${group.provider} · ${group.countryName}`,
      items: group.items,
    }));
}

export default function Command() {
  const [providerFilter, setProviderFilter] = useState(ALL_PROVIDERS);

  const providers = useMemo(() => [...new Set(PROVIDER_TEST_IBANS.map((entry) => entry.provider))].sort(), []);

  const entries = useMemo(() => {
    if (providerFilter === ALL_PROVIDERS) {
      return PROVIDER_TEST_IBANS;
    }
    return PROVIDER_TEST_IBANS.filter((entry) => entry.provider === providerFilter);
  }, [providerFilter]);

  const sections = useMemo(() => buildSections(entries), [entries]);

  const saveEntry = async (entry: ProviderTestIban) => {
    const prefs = await loadFormPrefs();
    const format: IbanFormat = prefs?.format ?? "grouped";
    const record = await buildSavedFromEntry(entry, format);
    await saveIban(record);
    return record;
  };

  if (PROVIDER_TEST_IBANS.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Box}
          title="No provider test IBANs"
          description="Provider fixtures are not available yet."
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search provider test IBANs…"
      searchBarAccessory={
        <ProviderFilterDropdown providers={providers} value={providerFilter} onChange={setProviderFilter} />
      }
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((entry) => {
            const country = getCountry(entry.countryCode);
            const flag = country?.flag ?? "🏳️";
            const color = outcomeColor(entry.outcome);
            const icon = outcomeIcon(entry.outcome);
            const issue = checkIban(entry.iban);

            const accessories: Array<{ icon?: string; tooltip?: string; tag?: { value: string; color: Color } }> = [
              { icon: flag, tooltip: country?.name ?? entry.countryCode },
            ];

            if (issue === "national-check") {
              accessories.push({
                tag: { value: "National Check Fails", color: Color.Orange },
                tooltip: NATIONAL_CHECK_ACCESSORY_TOOLTIP,
              });
            }

            return (
              <List.Item
                key={`${entry.provider}-${entry.iban}-${entry.label}`}
                icon={{ source: icon, tintColor: color }}
                title={entry.label}
                subtitle={groupedIban(entry.iban)}
                accessories={accessories}
                keywords={[
                  entry.provider,
                  entry.countryCode,
                  country?.name ?? "",
                  entry.outcome,
                  entry.iban,
                  entry.label,
                  entry.description ?? "",
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Use IBAN">
                      <Action
                        title="Paste and Save"
                        icon={Icon.Clipboard}
                        onAction={async () => {
                          const record = await saveEntry(entry);
                          await Clipboard.paste(ibanText(record));
                          await showHUD(`Pasted ${entry.provider} test IBAN`);
                        }}
                      />
                      <Action
                        title="Save as Current IBAN"
                        icon={{ source: Icon.Document, tintColor: Color.Blue }}
                        onAction={async () => {
                          await saveEntry(entry);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Saved as current IBAN",
                            message: entry.label,
                          });
                        }}
                      />
                      <Action.CopyToClipboard title="Copy IBAN" content={entry.iban} icon={Icon.CopyClipboard} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Provider">
                      <Action.OpenInBrowser title="Open Provider Docs" url={entry.sourceUrl} icon={Icon.Globe} />
                      {entry.description ? (
                        <Action.CopyToClipboard title="Copy Description" content={entry.description} icon={Icon.Text} />
                      ) : null}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
