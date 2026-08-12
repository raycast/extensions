import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { StoredEnvironment } from "./types";
import { getEnvironments } from "./storage";
import { resolveEnvColor } from "./colors";

export function useEnvironments() {
  return usePromise(getEnvironments);
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
