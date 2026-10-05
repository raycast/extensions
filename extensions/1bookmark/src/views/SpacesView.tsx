import { ActionPanel, Action, List, Icon, Keyboard, Color } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { MovedToDesktopView } from "./MovedToDesktopView";
import { SpaceItemActionPanel } from "../components/SpaceItemActionPanel";
import { DesktopAppNudgeItem } from "../components/DesktopAppNudgeItem";
import { useSortedSpaces } from "../hooks/use-sorted-spaces.hook";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";
import { useMe } from "../hooks/use-me.hook";
import { resolveSpaceIconUrl } from "../utils/space-icon.util";

function Body() {
  const { data, isFetching, isLoading } = useMe();
  const spaces = useSortedSpaces(data?.associatedSpaces);
  const { enabledSpaceIds, confirmAndToggleEnableDisableSpace } = useEnabledSpaces();

  if (isLoading || !spaces || !enabledSpaceIds) {
    return <List isLoading />;
  }

  return (
    <List isLoading={isFetching}>
      <DesktopAppNudgeItem />

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
                target={
                  <MovedToDesktopView title="New Space" lead="Spaces are created in the 1bookmark Desktop app." />
                }
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
          icon={resolveSpaceIconUrl(s.image) || (s.type === "TEAM" ? Icon.TwoPeople : Icon.Person)}
          accessories={[
            {
              tag: {
                value: enabledSpaceIds.includes(s.id) ? "Enabled" : "Disabled",
                color: enabledSpaceIds.includes(s.id) ? Color.Green : undefined,
              },
            },
          ]}
          actions={
            <SpaceItemActionPanel
              spaceId={s.id}
              enabled={enabledSpaceIds.includes(s.id)}
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
