import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";

import { EntityTypeInfo } from "../api/entityTypes";
import { assignableNames, labelFor } from "../filters/catalogue";
import { TYPE_ICONS, UNKNOWN_TYPE_ICON } from "../icons";

interface Props {
  catalogue: EntityTypeInfo[];
  isLoading: boolean;
  selected: string[];
  onChange: (names: string[]) => void;
}

/**
 * A view rather than a submenu: a submenu dismisses itself on every action, so building up a
 * selection would mean reopening it once per type.
 *
 * Local state mirrors the selection because a pushed view captures its props when pushed.
 */
export function TypeFilterList({ catalogue, isLoading, selected, onChange }: Props) {
  const [local, setLocal] = useState(selected);

  function apply(names: string[]) {
    setLocal(names);
    onChange(names);
  }

  function toggle(name: string) {
    apply(local.includes(name) ? local.filter((entry) => entry !== name) : [...local, name]);
  }

  const workItems = catalogue.filter((type) => type.assignable);
  const others = catalogue.filter((type) => !type.assignable);

  const presets = (
    <ActionPanel.Section title="Presets">
      <Action title="Work Items Only" icon={Icon.Undo} onAction={() => apply(assignableNames(catalogue))} />
      <Action title="Select Everything" icon={Icon.Globe} onAction={() => apply(catalogue.map((type) => type.name))} />
      <Action title="Clear Selection" icon={Icon.XMarkCircle} onAction={() => apply([])} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Filter Types"
      searchBarPlaceholder={`${local.length} of ${catalogue.length} types included`}
    >
      <List.EmptyView
        icon={Icon.Filter}
        title={isLoading ? "Loading Types…" : "No Types Available"}
        description={
          isLoading
            ? "Asking the instance which entity types it has."
            : "This instance reported no searchable entity types."
        }
      />
      {workItems.length > 0 ? <List.Section title="Work Items">{workItems.map(row)}</List.Section> : null}
      {others.length > 0 ? <List.Section title="Everything Else">{others.map(row)}</List.Section> : null}
    </List>
  );

  function row(type: EntityTypeInfo) {
    const isOn = local.includes(type.name);
    const label = labelFor(type.name);
    return (
      <List.Item
        key={type.name}
        icon={TYPE_ICONS[type.name] ?? UNKNOWN_TYPE_ICON}
        title={label}
        subtitle={type.name}
        accessories={isOn ? [{ tag: { value: "Included", color: Color.Green } }] : [{ text: "Excluded" }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={isOn ? `Exclude ${label}` : `Include ${label}`}
                icon={isOn ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={() => toggle(type.name)}
              />
              <Action title={`Only ${label}`} icon={Icon.Filter} onAction={() => apply([type.name])} />
            </ActionPanel.Section>
            {presets}
          </ActionPanel>
        }
      />
    );
  }
}
