import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCmuxErrorView } from "./cli";
import { listSurfaces, SurfaceList } from "./surfaces";

export default function Command() {
  const { data: surfaces, isLoading, error } = usePromise(listSurfaces);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} {...getCmuxErrorView(error)} />
      </List>
    );
  }

  return <SurfaceList surfaces={surfaces ?? []} isLoading={isLoading} searchBarPlaceholder="Search surfaces..." />;
}
