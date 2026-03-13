import { Icon, List } from "@raycast/api";
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
        <List.EmptyView title="Checking MacPorts installation..." />
      </List>
    );
  }

  if (!isInstalled) {
    return <Onboarding />;
  }

  return (
    <List isLoading={isLoadingInstalled} searchBarPlaceholder="Filter installed ports...">
      {installedPortsResult && installedPortsResult.length > 0 ? (
        <List.Section
          title="Installed"
          subtitle={isLoadingInstalled ? undefined : `${installedPortsResult?.length ?? 0}`}
        >
          {installedPortsResult.map((port) => (
            <InstalledListItem key={port} port={port} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView icon={Icon.Info} title="No installed ports yet" />
      )}
    </List>
  );
}
