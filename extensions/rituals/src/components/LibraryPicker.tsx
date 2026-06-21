import { Action, ActionPanel, Icon, Image, List, useNavigation } from "@raycast/api";
import { useState } from "react";

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike;
  /** The value handed back to onPick. */
  value: string;
}

export interface PickerSection {
  title: string;
  items: PickerItem[];
}

interface CustomEntry {
  /** Label for the "add what I typed" row, given the current search text. */
  label: (text: string) => string;
  /** Builds the value to pick from the current search text. */
  build: (text: string) => string;
  icon?: Image.ImageLike;
  /** Whether the typed text is a valid custom entry. Defaults to non-empty. */
  isValid?: (text: string) => boolean;
}

interface Props {
  navigationTitle: string;
  searchBarPlaceholder?: string;
  sections: PickerSection[];
  isLoading?: boolean;
  custom?: CustomEntry;
  onPick: (value: string) => void;
}

export default function LibraryPicker({
  navigationTitle,
  searchBarPlaceholder,
  sections,
  isLoading,
  custom,
  onPick,
}: Props) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim().toLowerCase();

  function pick(value: string) {
    onPick(value);
    pop();
  }

  const filtered = sections
    .map((section) => ({
      ...section,
      items: query
        ? section.items.filter(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.subtitle?.toLowerCase().includes(query) ||
              item.value.toLowerCase().includes(query),
          )
        : section.items,
    }))
    .filter((section) => section.items.length > 0);

  const showCustom = custom && searchText.trim().length > 0 && (custom.isValid?.(searchText.trim()) ?? true);

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {showCustom && custom && (
        <List.Section title="Custom">
          <List.Item
            icon={custom.icon ?? Icon.Plus}
            title={custom.label(searchText.trim())}
            actions={
              <ActionPanel>
                <Action title="Add" icon={Icon.Plus} onAction={() => pick(custom.build(searchText.trim()))} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {filtered.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item
              key={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              actions={
                <ActionPanel>
                  <Action title="Add" icon={Icon.Plus} onAction={() => pick(item.value)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
