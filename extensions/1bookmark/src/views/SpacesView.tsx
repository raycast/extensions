import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { NewSpaceForm } from "./NewSpaceForm";
import { SpaceItemActionPanel } from "../components/SpaceItemActionPanel";
import { useSortedSpaces } from "../hooks/use-sorted-spaces.hook";

function Body() {
  const { data, isFetched, refetch } = trpc.user.me.useQuery();
  const spaces = useSortedSpaces(data?.associatedSpaces);

  if (!isFetched || !spaces) {
    return <List isLoading />;
  }

  return (
    <List>
      {spaces.length < 1 && (
        <List.Item
          title={"Create new Team"}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push title="Select" target={<NewSpaceForm />} onPop={() => refetch()} />
            </ActionPanel>
          }
        />
      )}

      {spaces.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          icon={s.image ?? (s.type === "TEAM" ? Icon.TwoPeople : Icon.Person)}
          actions={<SpaceItemActionPanel me={data} spaceId={s.id} refetch={refetch} />}
        />
      ))}
    </List>
  );
}

export function Spaces() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
