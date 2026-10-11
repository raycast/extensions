import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { SourceCategory, SourceItem } from "../lib/source-items";

export const SOURCE_CATEGORIES: { id: SourceCategory; title: string }[] = [
  { id: "plugins", title: "Plugins" },
  { id: "themes", title: "Themes" },
  { id: "snippets", title: "CSS Snippets" },
  { id: "settings", title: "Core Settings" },
];

export function SourceItemBrowser({
  items,
  initialSelected,
  onChange,
  onSubmit,
  submitTitle,
  isLoading,
}: {
  items: SourceItem[];
  initialSelected: string[];
  onChange: (ids: string[]) => void;
  onSubmit: (ids: string[]) => Promise<void>;
  submitTitle: string;
  isLoading?: boolean;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [categoryFilter, setCategoryFilter] = useState("all");

  function update(ids: string[]) {
    setSelected(ids);
    onChange(ids);
  }

  function toggle(item: SourceItem) {
    update(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id]);
  }

  function setCategorySelection(category: SourceCategory, include: boolean) {
    const other = selected.filter((id) => !id.startsWith(`${category}/`));
    update(include ? [...other, ...items.filter((item) => item.category === category).map((item) => item.id)] : other);
  }

  function setGroupSelection(category: SourceCategory, group: string, include: boolean) {
    const matches = items.filter((item) => item.category === category && item.group === group).map((item) => item.id);
    const other = selected.filter((id) => !matches.includes(id));
    update(include ? [...other, ...matches] : other);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search plugins, themes, snippets, and settings..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Components" value={categoryFilter} onChange={setCategoryFilter}>
          <List.Dropdown.Item value="all" title="All Components" />
          {SOURCE_CATEGORIES.map(({ id, title }) => (
            <List.Dropdown.Item key={id} value={id} title={title} />
          ))}
        </List.Dropdown>
      }
    >
      {SOURCE_CATEGORIES.filter(({ id }) => categoryFilter === "all" || categoryFilter === id).map(({ id, title }) => {
        const categoryItems = items.filter((item) => item.category === id);
        const groups = id === "settings" ? [...new Set(categoryItems.map((item) => item.group ?? title))] : [title];
        return groups.map((group) => {
          const groupItems =
            id === "settings" ? categoryItems.filter((item) => (item.group ?? title) === group) : categoryItems;
          return (
            <List.Section
              key={`${id}/${group}`}
              title={id === "settings" ? `Core Settings · ${group}` : title}
              subtitle={`${groupItems.filter((item) => selected.includes(item.id)).length} of ${groupItems.length} selected`}
            >
              {groupItems.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <List.Item
                    key={item.id}
                    icon={checked ? Icon.CheckCircle : Icon.Circle}
                    title={item.name}
                    subtitle={item.description ?? title}
                    accessories={checked ? [{ text: "Selected" }] : []}
                    actions={
                      <ActionPanel>
                        <Action
                          title={checked ? "Remove from Selection" : "Add to Selection"}
                          onAction={() => toggle(item)}
                        />
                        <Action title={`${submitTitle} (${selected.length})`} onAction={() => onSubmit(selected)} />
                        <Action
                          title={`Select All ${group}`}
                          onAction={() =>
                            id === "settings" ? setGroupSelection(id, group, true) : setCategorySelection(id, true)
                          }
                        />
                        <Action
                          title={`Clear ${group}`}
                          onAction={() =>
                            id === "settings" ? setGroupSelection(id, group, false) : setCategorySelection(id, false)
                          }
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        });
      })}
      <List.EmptyView title="No components found" description="Check the Default Vault or change the search/filter." />
    </List>
  );
}
