import { List } from "@raycast/api";
import usePackages from "./hooks/usePackages";
import PackageListItem from "./components/PackageListItem";
import RefreshPackagesAction from "./components/RefreshAction";

export default function Command() {
  const { isLoading, data, revalidate } = usePackages();
  const refreshAction = <RefreshPackagesAction refreshPackages={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by package name or description...">
      {(data?.data || []).map((pkg) => (
        <PackageListItem key={pkg.name} pkg={pkg} refreshAction={refreshAction} />
      ))}
    </List>
  );
}
