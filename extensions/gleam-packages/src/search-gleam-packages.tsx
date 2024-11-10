import { List } from "@raycast/api";
import usePackages from "./hooks/usePackages";
import PackageListItem from "./components/PackageListItem";
import RefreshPackagesAction from "./components/RefreshAction";

export default function Command() {
  const { isLoading, data, refresh } = usePackages();

  const refreshAction = <RefreshPackagesAction refreshPackages={refresh} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by package name or description...">
      {(data || []).map((pkg) => (
        <PackageListItem key={pkg.id} pkg={pkg} refreshAction={refreshAction} />
      ))}
    </List>
  );
}
