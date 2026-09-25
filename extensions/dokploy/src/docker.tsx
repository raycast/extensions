import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { DockerContainer } from "./interfaces";
import { type Instance, instanceId, useInstanceScope, tokenForInstance } from "./instances";

export default function Docker({ instance: initial }: { instance: Instance }) {
  const { url, headers, instance, dropdown } = useInstanceScope(initial);

  const { isLoading, data: containers } = useFetch<DockerContainer[], DockerContainer[]>(url + "docker.getContainers", {
    headers,
    initialData: [],
  });

  const { data: sortedContainers, visitItem } = useFrecencySorting(containers, {
    namespace: instanceId(instance),
    key: (container) => container.containerId,
  });

  return (
    <List navigationTitle="Docker" isLoading={isLoading} searchBarAccessory={dropdown}>
      {sortedContainers.map((container) => (
        <List.Item
          key={container.containerId}
          icon={Icon.Box}
          title={container.name}
          accessories={[{ tag: container.state }, { text: container.status }, { text: container.image }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.WrenchScrewdriver}
                title="View Config"
                target={<DockerConfig container={container} instance={instance} />}
                onPush={() => visitItem(container)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DockerConfig({ container, instance }: { container: DockerContainer; instance: Instance }) {
  const { url, headers } = tokenForInstance(instance);
  const { isLoading, data } = useFetch(url + `docker.getConfig?containerId=${container.containerId}`, {
    headers,
  });

  return (
    <Detail
      navigationTitle="Docker"
      isLoading={isLoading}
      markdown={
        `${container.name} (${container.containerId})\n` +
        `\`\`\`json\n${JSON.stringify(data, null, 4) ?? "Loading..."}`
      }
    />
  );
}
