import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listSurfaces, SurfaceList } from "./surfaces";

export default function Command() {
  const { data: surfaces, isLoading, error } = usePromise(listSurfaces);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="cmux is not running" description={error.message} />
      </List>
    );
  }

  return <SurfaceList surfaces={surfaces ?? []} isLoading={isLoading} searchBarPlaceholder="Search surfaces..." />;
}
