import { ActionPanel, Action, List, Icon, Keyboard, Color } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { NewSpaceForm } from "./NewSpaceForm";
import { SpaceItemActionPanel } from "../components/SpaceItemActionPanel";
import { useSortedSpaces } from "../hooks/use-sorted-spaces.hook";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";
import { useMe } from "../hooks/use-me.hook";
import { trpc } from "../utils/trpc.util";

function Body() {
  const { data, isFetching, refetch: refetchMe, isLoading } = useMe();
  const spaces = useSortedSpaces(data?.associatedSpaces);
  const { enabledSpaceIds, confirmAndToggleEnableDisableSpace } = useEnabledSpaces();
  const { data: authenticatedSpaceIds, refetch: refetchAuthenticatedSpaceIds } =
    trpc.spaceAuth.listAuthenticatedSpaceIds.useQuery();

  const refetch = async () => {
    await Promise.all([refetchMe(), refetchAuthenticatedSpaceIds()]);
  };

  if (isLoading || !spaces || !enabledSpaceIds || !authenticatedSpaceIds) {
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
          accessories={[
            !authenticatedSpaceIds.includes(s.id)
              ? {
                  tag: {
                    value: "Requires Re-Authentication",
                    color: enabledSpaceIds.includes(s.id) ? Color.Orange : Color.SecondaryText,
                  },
                }
              : {},
            {
              tag: {
                value: enabledSpaceIds.includes(s.id) ? "Enabled" : "Disabled",
                color: enabledSpaceIds.includes(s.id)
                  ? authenticatedSpaceIds.includes(s.id)
                    ? Color.Green
                    : Color.SecondaryText
                  : undefined,
              },
            },
          ]}
          actions={
            <SpaceItemActionPanel
              spaceId={s.id}
              refetch={refetch}
              type={s.type}
              enabled={enabledSpaceIds.includes(s.id)}
              authenticated={authenticatedSpaceIds.includes(s.id)}
              toggleSpace={confirmAndToggleEnableDisableSpace}
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
