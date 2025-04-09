import { ActionPanel, Action, List, Icon, Keyboard, Color } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { NewSpaceForm } from "./NewSpaceForm";
import { SpaceItemActionPanel } from "../components/SpaceItemActionPanel";
import { useSortedSpaces } from "../hooks/use-sorted-spaces.hook";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";

function Body() {
  const { data, isFetching, refetch, isLoading } = trpc.user.me.useQuery();
  const spaces = useSortedSpaces(data?.associatedSpaces);
  const { enabledSpaceIds, toggleEnableDisable } = useEnabledSpaces();

  if (isLoading || !spaces || !enabledSpaceIds) {
    return <List isLoading />;
  }

  return (
    <List isLoading={isFetching}>
      {spaces.length < 1 && (
        <List.Item
          title={"Create new Space"}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<NewSpaceForm />}
                onPop={() => refetch()}
              />
            </ActionPanel>
          }
        />
      )}

      {spaces.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          subtitle={s.type === "PERSONAL" ? "This is a private space for you" : undefined}
          icon={s.image || (s.type === "TEAM" ? Icon.TwoPeople : Icon.Person)}
          accessories={
            enabledSpaceIds.includes(s.id)
              ? [{ tag: { value: "Enabled", color: Color.Green } }]
              : [{ tag: { value: "Disabled" } }]
          }
          actions={
            <SpaceItemActionPanel
              spaceId={s.id}
              refetch={refetch}
              type={s.type}
              enabled={enabledSpaceIds.includes(s.id)}
              toggleSpace={toggleEnableDisable}
            />
          }
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
