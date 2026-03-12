import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EnvColorValue, StoredEnvironment } from "./types";
import { getEnvironments } from "./storage";

const COLOR_MAP: Record<EnvColorValue, Color> = {
  Blue: Color.Blue,
  Green: Color.Green,
  Orange: Color.Orange,
  Red: Color.Red,
  Purple: Color.Purple,
  Yellow: Color.Yellow,
  Magenta: Color.Magenta,
};

export function resolveEnvColor(env: StoredEnvironment): Color {
  return COLOR_MAP[env.color] ?? Color.Blue;
}

export function useEnvironments() {
  return useCachedPromise(getEnvironments);
}

export function EnvDropdown({
  environments,
  selectedId,
  onSelect,
}: {
  environments: StoredEnvironment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Select Environment" value={selectedId} onChange={onSelect}>
      <List.Dropdown.Section title="Environments">
        {environments.map((env) => (
          <List.Dropdown.Item
            key={env.id}
            title={`${env.name} (${env.clusterName})`}
            value={env.id}
            icon={{ source: Icon.Circle, tintColor: resolveEnvColor(env) }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
