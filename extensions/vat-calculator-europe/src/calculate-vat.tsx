import { ActionPanel, Action, List, LaunchProps, Icon } from "@raycast/api";
import { useState } from "react";
import { findCountry, getCountries, calculateVat, parseAmount } from "./vat";

const DEFAULT_COUNTRY = "DE";

export default function Command(
  props: LaunchProps<{ arguments: { amount: string; country: string } }>,
) {
  const { amount, country } = props.arguments;

  // The search bar doubles as the live amount input, pre-filled with the value
  // typed when launching the command. When run as a Raycast fallback command,
  // the root-search text arrives via fallbackText and takes priority.
  const [searchText, setSearchText] = useState(
    props.fallbackText ?? amount ?? "",
  );

  // The country is changeable at runtime via the search-bar dropdown, so it
  // lives in state. The launch argument only seeds the initial value.
  const [countryCode, setCountryCode] = useState(country || DEFAULT_COUNTRY);

  // Single source for the selectable countries. Swapping vat.json for an API
  // later only means changing getCountries() — this view stays the same.
  const countries = getCountries();
  const selectedCountry = findCountry(countryCode);

  // Search-bar accessory dropdown (top-right). Unlike the package.json launch
  // argument, this is populated at runtime and reflects whatever getCountries()
  // returns — file today, API tomorrow.
  const countryDropdown = (
    <List.Dropdown
      tooltip="Country"
      value={countryCode}
      onChange={setCountryCode}
    >
      {countries.map((c) => (
        <List.Dropdown.Item key={c.code} title={c.name} value={c.code} />
      ))}
    </List.Dropdown>
  );

  const amountValue = selectedCountry ? parseAmount(searchText) : null;
  const sections =
    selectedCountry && amountValue !== null
      ? calculateVat(amountValue, selectedCountry)
      : [];

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Amount (net or gross), e.g. 9.99 or 9,99"
      searchBarAccessory={countryDropdown}
      navigationTitle={selectedCountry?.name ?? countryCode}
    >
      {!selectedCountry ? (
        // Edge case: the selected country has no VAT data.
        <List.EmptyView
          icon={Icon.Globe}
          title="No VAT data"
          description={`No VAT data for ${countryCode} yet.`}
        />
      ) : amountValue === null ? (
        // Edge cases: invalid number / comma vs. dot decimal separator.
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Invalid amount"
          description="Enter a valid amount, e.g. 9.99 or 9,99."
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.lines.map((line) => (
              <List.Item
                key={line.label}
                title={line.label}
                accessories={[{ text: line.formatted }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={line.copyValue} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
