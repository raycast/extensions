import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { phpipam } from "./api";
import {
  ErrorView,
  SubnetDetailView,
  copyFirstFreeAddress,
  silentPromiseOptions,
} from "./components";
import { isFolder, s, sortSubnets, subnetLabel } from "./utils";

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(
    () => phpipam.allSubnets(),
    [],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const subnets = sortSubnets(data ?? []).filter((subnet) => !isFolder(subnet));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick a subnet…">
      {subnets.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Globe} title="No subnets found" />
      ) : null}
      {subnets.map((subnet) => (
        <List.Item
          key={s(subnet.id)}
          icon={Icon.Globe}
          title={subnetLabel(subnet)}
          subtitle={s(subnet.description)}
          keywords={[s(subnet.description)]}
          actions={
            <ActionPanel>
              <Action
                title="Find & Copy First Free Address"
                icon={Icon.Clipboard}
                onAction={() => copyFirstFreeAddress(subnet)}
              />
              <Action.Push
                title="Show Subnet"
                icon={Icon.ChevronRight}
                target={<SubnetDetailView subnetId={s(subnet.id)} />}
              />
              <Action.CopyToClipboard
                title="Copy CIDR"
                content={subnetLabel(subnet)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
