import { Icon, List } from "@raycast/api";

import { EntityType } from "../types";

interface EntityTypeDropdownProps {
  onEntityTypeChange: (type: EntityType) => void;
}

const ENTITY_TYPES: { value: EntityType; title: string; icon: Icon }[] = [
  { value: "artist", title: "Artist", icon: Icon.Person },
  { value: "release", title: "Release", icon: Icon.Cd },
  { value: "recording", title: "Recording", icon: Icon.Music },
  { value: "release-group", title: "Release Group", icon: Icon.AppWindowList },
  { value: "label", title: "Label", icon: Icon.Building },
  { value: "work", title: "Work", icon: Icon.Document },
];

export function EntityTypeDropdown({ onEntityTypeChange }: EntityTypeDropdownProps) {
  return (
    <List.Dropdown tooltip="Entity Type" onChange={(value) => onEntityTypeChange(value as EntityType)}>
      {ENTITY_TYPES.map((entityType) => (
        <List.Dropdown.Item
          key={entityType.value}
          value={entityType.value}
          title={entityType.title}
          icon={entityType.icon}
        />
      ))}
    </List.Dropdown>
  );
}
