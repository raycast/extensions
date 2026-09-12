import { Action, ActionPanel, Icon } from "@raycast/api";

import { SearchGroupOption } from "../hooks/useSearchGroups";

export default function SearchGroupSubmenu({
  groups,
  value,
  onChange,
}: {
  groups: SearchGroupOption[];
  value: string;
  onChange: (newScope: string) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <ActionPanel.Submenu
      title="Change Search Group"
      icon={Icon.MagnifyingGlass}
      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
    >
      {groups.map((group) => (
        <Action
          key={group.scope}
          title={group.label}
          icon={group.scope === value ? Icon.CheckCircle : Icon.Circle}
          onAction={() => onChange(group.scope)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
