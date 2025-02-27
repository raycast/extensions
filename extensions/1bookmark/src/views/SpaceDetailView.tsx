import { List, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";

function Body() {
  const me = trpc.user.me.useQuery();
  const associatedSpaces = me.data?.associatedSpaces;

  if (me.isLoading || !associatedSpaces) {
    return <List isLoading />;
  }

  return (
    <List>
      <List.Item title={"Space Detail View"} icon={Icon.Plus} />
    </List>
  );
}

export function SpaceDetailView() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
