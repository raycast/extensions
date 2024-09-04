import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, ToastStyle } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import yaml from "js-yaml";

interface PortDetails {
  name: string;
  platform?: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
}

interface PortsYaml {
  ports: Record<string, PortDetails>;
}

export default function SearchPorts() {
  const { isLoading, data, revalidate } = useFetch(
    "https://raw.githubusercontent.com/catppuccin/catppuccin/main/resources/ports.yml"
  );
  const [ports, setPorts] = useState<Record<string, PortDetails>>({});
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    if (data) {
      try {
        const parsedData = yaml.load(data) as PortsYaml;
        setPorts(parsedData.ports);
      } catch (error) {
        showToast(ToastStyle.Failure, "Failed to parse YAML", String(error));
      }
    }
  }, [data]);

  const filteredPorts = searchText
    ? Object.entries(ports).filter(
        ([name, portDetails]) =>
          name.toLowerCase().includes(searchText.toLowerCase()) ||
          portDetails.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : Object.entries(ports);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search ports..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {filteredPorts.map(([portName, portDetails]) => {
        const githubLink = `https://github.com/catppuccin/${portName}`;
        const platform = Array.isArray(portDetails.platform)
          ? portDetails.platform.join(", ")
          : portDetails.platform || "Unknown Platform";

        return (
          <List.Item
            key={portName}
            title={portDetails.name}
            subtitle={`Platforms: ${platform}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}