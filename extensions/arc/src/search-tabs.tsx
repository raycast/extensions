import { LaunchProps } from "@raycast/api";
import { getTabsWithSpaceInfo } from "./arc";
import { SearchTabsBase } from "./components/search-tabs-base";
import { VersionCheck } from "./version";

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchTabsBase {...props} getTabsFunction={getTabsWithSpaceInfo} />
    </VersionCheck>
  );
}
