import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ReactElement } from "react";
import { DEFAULT_PROFILE_ID } from "./constants";
import { getCurrentProfileCacheKey } from "./utils/appUtils";
import { useWorkspaceSearch } from "./hooks/useWorkspaceSearch";
import EdgeProfileDropDown from "./components/EdgeProfileDropdown";
import { EdgeListItems } from "./components";

export default function Command() {
  const [profile] = useCachedState(getCurrentProfileCacheKey(), DEFAULT_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useWorkspaceSearch();

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List isLoading={isLoading} searchBarAccessory={<EdgeProfileDropDown onProfileSelected={revalidate} />}>
      {data?.map((workspace) => (
        <EdgeListItems.Workspace key={workspace.id} workspace={workspace} profile={profile} />
      ))}
    </List>
  );
}
