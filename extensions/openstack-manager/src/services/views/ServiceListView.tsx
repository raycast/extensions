import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ConfigManager } from "../../config/ConfigManager";
import { ResourceCache } from "../../core/ResourceCache";
import ServersView from "./ServersView";
import FlavorsView from "./FlavorsView";
import ImagesView from "./ImagesView";
import NetworksView from "./NetworksView";
import SecurityGroupsView from "./SecurityGroupsView";
import ClustersView from "./ClustersView";

interface ServiceListViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

interface ServiceEntry {
  name: string;
  icon: Icon;
}

const SERVICES: ServiceEntry[] = [
  { name: "Servers", icon: Icon.Desktop },
  { name: "Flavors", icon: Icon.MemoryChip },
  { name: "Images", icon: Icon.Document },
  { name: "Networks", icon: Icon.Network },
  { name: "Security Groups", icon: Icon.Shield },
  { name: "Kubernetes Clusters", icon: Icon.ComputerChip },
];

export default function ServiceListView({
  configName,
  horizonUrl,
  binaryPath,
  cache,
  configManager,
}: ServiceListViewProps) {
  function getTargetView(serviceName: string) {
    const props = { configName, horizonUrl, binaryPath, cache, configManager };
    switch (serviceName) {
      case "Servers":
        return <ServersView {...props} />;
      case "Flavors":
        return <FlavorsView {...props} />;
      case "Images":
        return <ImagesView {...props} />;
      case "Networks":
        return <NetworksView {...props} />;
      case "Security Groups":
        return <SecurityGroupsView {...props} />;
      case "Kubernetes Clusters":
        return <ClustersView {...props} />;
      default:
        return <ServersView {...props} />;
    }
  }

  return (
    <List searchBarPlaceholder="Search services..." navigationTitle={`Services — ${configName}`}>
      {SERVICES.map((service) => (
        <List.Item
          key={service.name}
          icon={service.icon}
          title={service.name}
          actions={
            <ActionPanel>
              <Action.Push title="Browse" icon={Icon.List} target={getTargetView(service.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
