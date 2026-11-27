import { LaunchProps } from "@raycast/api";
import { getTabsWithSpaceInfo } from "./cra";
import { SearchTabsBase } from "./components/search-tabs-base";

export default function Command(props: LaunchProps) {
  return <SearchTabsBase {...props} getTabsFunction={getTabsWithSpaceInfo} />;
}
