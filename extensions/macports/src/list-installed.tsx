import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listInstalledPorts, isMacPortsInstalled } from "./exec";
import InstalledListItem from "./components/InstalledListItem";
import { Onboarding } from "./components/Onboarding";

export default function Command() {
  const { data: isInstalled, isLoading: isCheckingInstallation } = usePromise(async () => isMacPortsInstalled());
  const { data: installedPortsResult, isLoading: isLoadingInstalled } = usePromise(async () => listInstalledPorts());

  if (isCheckingInstallation) {
    return (
      <List isLoading={true}>
        <List.Item title="Checking MacPorts installation..." />
      </List>
    );
  }

  if (!isInstalled) {
    return <Onboarding />;
  }

  return (
    <List isLoading={isLoadingInstalled} searchBarPlaceholder="Filter installed ports...">
      <List.Section
        title="Installed"
        subtitle={isLoadingInstalled ? undefined : `${installedPortsResult?.length ?? 0}`}
      >
        {isLoadingInstalled ? (
          <List.Item title="Loading installed ports..." />
        ) : installedPortsResult && installedPortsResult.length > 0 ? (
          installedPortsResult.map((port) => <InstalledListItem key={port} port={port} />)
        ) : (
          <List.Item title="No installed ports found" />
        )}
      </List.Section>
    </List>
  );
}
