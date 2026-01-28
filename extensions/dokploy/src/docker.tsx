import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { DockerContainer } from "./interfaces";
import { useToken } from "./instances";

export default function Docker() {
  const { url, headers } = useToken();

  const { isLoading, data: containers } = useFetch<DockerContainer[], DockerContainer[]>(url + "docker.getContainers", {
    headers,
    initialData: [],
  });

  return (
    <List navigationTitle="Docker" isLoading={isLoading}>
      {containers.map((container) => (
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
                target={<DockerConfig container={container} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DockerConfig({ container }: { container: DockerContainer }) {
  const { url, headers } = useToken();
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
