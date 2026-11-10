import { Action, ActionPanel, Color, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import { EMPTY_PREFS, ProfilePrefs, moveProfile, orderedIds, parsePrefs, toggleHidden } from "../lib/profile-prefs";

export const PREFS_KEY = "profile-prefs";

export async function loadProfilePrefs(): Promise<ProfilePrefs> {
  return parsePrefs(await LocalStorage.getItem<string>(PREFS_KEY));
}

export function useProfilePrefs() {
  const { data, mutate, revalidate, isLoading } = useCachedPromise(loadProfilePrefs, [], { keepPreviousData: true });
  async function save(next: ProfilePrefs) {
    await mutate(LocalStorage.setItem(PREFS_KEY, JSON.stringify(next)), {
      optimisticUpdate: () => next,
      shouldRevalidateAfter: false,
    });
  }
  return { prefs: data ?? EMPTY_PREFS, save, revalidate, isLoading };
}

interface ProfileRef {
  profile: string;
  name: string;
}

export function CreateQuicklinkAction(props: ProfileRef) {
  return (
    <Action.CreateQuicklink
      title={`Create Quicklink for ${props.name}`}
      quicklink={{
        name: `Claude Usage ${props.name}`,
        link: createDeeplink({ command: "usage-overview", context: { profile: props.profile } }),
      }}
    />
  );
}

/** Opens the layout editor and refreshes the caller's layout when it closes. */
export function ManageProfilesAction(props: { profiles: ProfileRef[]; onChange: () => void }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Manage Profiles"
      icon={Icon.AppWindowList}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={() => push(<ManageProfiles profiles={props.profiles} />, props.onChange)}
    />
  );
}

function ManageProfiles(props: { profiles: ProfileRef[] }) {
  const { prefs, save, isLoading } = useProfilePrefs();
  const available = props.profiles.map((p) => p.profile);
  const byId = new Map(props.profiles.map((p) => [p.profile, p]));
  const order = orderedIds(prefs, available);

  return (
    <List isLoading={isLoading} navigationTitle="Manage Profiles" searchBarPlaceholder="Filter profiles">
      <List.EmptyView
        icon={Icon.AppWindowList}
        title="No Profiles"
        description="Add a profile in Claude Usage first."
      />
      <List.Section title="Shown top to bottom" subtitle="↵ show or hide · ⌘⌥↑↓ reorder">
        {order.map((id, index) => {
          const profile = byId.get(id);
          if (!profile) return null;
          const hidden = prefs.hidden.includes(id);
          return (
            <List.Item
              key={id}
              title={profile.name}
              icon={
                hidden
                  ? { source: Icon.Circle, tintColor: Color.SecondaryText }
                  : { source: Icon.CheckCircle, tintColor: Color.Green }
              }
              accessories={[{ text: hidden ? "Hidden" : `#${index + 1}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title={hidden ? "Show Profile" : "Hide Profile"}
                    icon={hidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => save(toggleHidden(prefs, id))}
                  />
                  <CreateQuicklinkAction {...profile} />
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() => save(moveProfile(prefs, available, id, -1))}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() => save(moveProfile(prefs, available, id, 1))}
                  />
                  <Action
                    title="Reset Layout"
                    icon={Icon.RotateAntiClockwise}
                    style={Action.Style.Destructive}
                    onAction={() => save(EMPTY_PREFS)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
