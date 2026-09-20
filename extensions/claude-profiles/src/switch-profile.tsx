import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useRef, useState } from "react";
import RenameProfile from "./components/rename-profile";
import CreateProfile from "./create-profile";
import {
  ClaudeProfile,
  RegistryError,
  isRunning,
  launchClaudeProfile,
  registry,
} from "./lib/profiles";

interface Data {
  profiles: ClaudeProfile[];
  orphans: string[];
  running: Record<string, boolean>;
}

async function fetchData(): Promise<Data> {
  const profiles = await registry.load();
  const orphans = await registry.orphans();
  const running: Record<string, boolean> = {};
  await Promise.all(
    profiles.map(async (profile) => {
      running[profile.id] = await isRunning(profile.dataDir);
    }),
  );
  return { profiles, orphans, running };
}

function quicklinkFor(profile: ClaudeProfile): string {
  return `raycast://extensions/caleb_barzee/claude-profiles/switch-profile?arguments=${encodeURIComponent(
    JSON.stringify({ profile: profile.id }),
  )}`;
}

export default function SwitchProfile(
  props: LaunchProps<{ arguments: { profile?: string } }>,
) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const appliedArgument = useRef(false);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    fetchData,
    [],
    { failureToastOptions: { title: "Couldn't read profiles" } },
  );

  async function handleLaunch(profile: ClaudeProfile) {
    try {
      await launchClaudeProfile(profile.dataDir);
      await closeMainWindow();
      await showHUD(`Opened ${profile.name}`);
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't launch Claude" });
    }
  }

  useEffect(() => {
    if (appliedArgument.current || !data) return;
    const argument = props.arguments.profile;
    if (!argument) return;
    appliedArgument.current = true;

    const trimmed = argument.trim();
    const matches = data.profiles.filter(
      (profile) =>
        profile.id === trimmed ||
        profile.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (matches.length === 1) {
      handleLaunch(matches[0]);
    } else {
      setSearchText(argument);
    }
  }, [data, props.arguments.profile]);

  async function handleRemove(profile: ClaudeProfile) {
    const confirmed = await confirmAlert({
      title: `Remove "${profile.name}" from the list?`,
      message: `Its login and chats stay at ${profile.dataDir}. Restore it later from "Not in the List".`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await registry.remove(profile.id, false);
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't remove profile" });
    }
  }

  async function handleDelete(profile: ClaudeProfile) {
    const confirmed = await confirmAlert({
      title: `Delete "${profile.name}" and its data?`,
      message: `This permanently deletes ${profile.dataDir}. This can't be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await registry.remove(profile.id, true);
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't remove profile" });
    }
  }

  async function handleRestore(dir: string) {
    try {
      const restored = await registry.restore(dir);
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: `Restored "${restored.name}"`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't restore profile" });
    }
  }

  async function handleDeleteFolder(dir: string) {
    const confirmed = await confirmAlert({
      title: `Delete ${dir}?`,
      message:
        "This permanently deletes its saved login and chat history. This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await registry.deleteFolder(dir);
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't delete folder" });
    }
  }

  if (error && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't read the profile list"
          description={error.message}
          actions={
            <ActionPanel>
              {error instanceof RegistryError && (
                <Action.ShowInFinder path={error.path} />
              )}
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const profiles = data?.profiles ?? [];
  const orphans = data?.orphans ?? [];
  const running = data?.running ?? {};
  const isEmpty =
    !isLoading && !!data && profiles.length === 0 && orphans.length === 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search profiles"
    >
      {isEmpty ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No Claude profiles yet"
          description="Create one to get an isolated Claude Desktop login."
          actions={
            <ActionPanel>
              <Action
                title="Create Profile"
                icon={Icon.Plus}
                onAction={() => push(<CreateProfile onCreated={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Profiles">
            {profiles.map((profile) => (
              <List.Item
                key={profile.id}
                icon={{ source: Icon.PersonCircle, tintColor: Color.Blue }}
                title={profile.name}
                subtitle={profile.id}
                keywords={[profile.id]}
                accessories={
                  running[profile.id]
                    ? [{ tag: { value: "Running", color: Color.Green } }]
                    : []
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Claude"
                      icon={Icon.ArrowRight}
                      onAction={() => handleLaunch(profile)}
                    />
                    <Action.CreateQuicklink
                      title="Create Quicklink"
                      icon={Icon.Link}
                      quicklink={{
                        name: `Open Claude (${profile.name})`,
                        link: quicklinkFor(profile),
                      }}
                    />
                    <Action.Push
                      title="Rename"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <RenameProfile
                          profile={profile}
                          onRenamed={revalidate}
                        />
                      }
                    />
                    <Action
                      title="Create Profile"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      onAction={() =>
                        push(<CreateProfile onCreated={revalidate} />)
                      }
                    />
                    <ActionPanel.Section>
                      <Action.ShowInFinder
                        path={profile.dataDir}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Data Dir Path"
                        content={profile.dataDir}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Remove from List…"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => handleRemove(profile)}
                      />
                      <Action
                        title="Delete Profile & Data…"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "backspace",
                        }}
                        onAction={() => handleDelete(profile)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {orphans.length > 0 && (
            <List.Section
              title="Not in the List"
              subtitle="folders under Claude Profiles that no entry points at"
            >
              {orphans.map((dir) => (
                <List.Item
                  key={dir}
                  icon={Icon.Folder}
                  title={basename(dir)}
                  subtitle="not in the list"
                  actions={
                    <ActionPanel>
                      <Action
                        title="Restore to List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => handleRestore(dir)}
                      />
                      <Action.ShowInFinder path={dir} />
                      <Action
                        title="Delete Folder…"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteFolder(dir)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
