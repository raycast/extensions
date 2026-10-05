import { LaunchProps } from "@raycast/api";
import { getActiveSpace, getTabsInSpace } from "./arc";
import { SearchTabsBase } from "./components/search-tabs-base";
import { VersionCheck } from "./version";

async function getTabsInCurrentSpace() {
  const activeSpace = await getActiveSpace();
  if (!activeSpace) return undefined;
  return getTabsInSpace(activeSpace.id);
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchTabsBase {...props} getTabsFunction={getTabsInCurrentSpace} />
    </VersionCheck>
  );
}
