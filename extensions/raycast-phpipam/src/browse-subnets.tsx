import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { phpipam } from "./api";
import { ErrorView, SubnetListItem, silentPromiseOptions } from "./components";
import { s, sortSubnets } from "./utils";

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(
    () => phpipam.allSubnets(),
    [],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const subnets = sortSubnets(data ?? []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter subnets by CIDR, description or VLAN…"
    >
      {subnets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No subnets found"
          description="Create subnets in phpIPAM first."
        />
      ) : null}
      {subnets.map((subnet) => (
        <SubnetListItem
          key={s(subnet.id)}
          subnet={subnet}
          sectionId={s(subnet.sectionId)}
        />
      ))}
    </List>
  );
}
