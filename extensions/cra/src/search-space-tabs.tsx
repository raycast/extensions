import { LaunchProps } from "@raycast/api";
import { getActiveSpace, getTabsInSpace } from "./cra";
import { SearchTabsBase } from "./components/search-tabs-base";

async function getTabsInCurrentSpace() {
  const activeSpace = await getActiveSpace();
  if (!activeSpace) return undefined;
  return getTabsInSpace(activeSpace.id);
}

export default function Command(props: LaunchProps) {
  return <SearchTabsBase {...props} getTabsFunction={getTabsInCurrentSpace} />;
}
