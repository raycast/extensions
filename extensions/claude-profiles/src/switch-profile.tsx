import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CreateProfile from "./create-profile";
import {
  ClaudeProfile,
  getProfiles,
  launchClaudeProfile,
  removeProfile,
} from "./lib/profiles";

export default function SwitchProfile() {
  const [profiles, setProfiles] = useState<ClaudeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function load() {
    setIsLoading(true);
    setProfiles(await getProfiles());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLaunch(profile: ClaudeProfile) {
    try {
      await launchClaudeProfile(profile.dataDir);
      await closeMainWindow();
      await showHUD(`Opened ${profile.name}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't launch Claude",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleRemove(profile: ClaudeProfile) {
    const confirmed = await confirmAlert({
      title: `Remove "${profile.name}" from the list?`,
      message:
        "Its login and chats stay on disk. Re-add it later with `claude-profiles profile add`.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeProfile(profile.id, false);
    await load();
  }

  async function handleDelete(profile: ClaudeProfile) {
    const confirmed = await confirmAlert({
      title: `Delete "${profile.name}" and its data?`,
      message:
        "This permanently deletes its saved login and chat history. This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeProfile(profile.id, true);
    await load();
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.PersonCircle}
        title="No Claude profiles yet"
        description="Create one to get an isolated Claude Desktop login."
        actions={
          <ActionPanel>
            <Action
              title="Create Profile"
              icon={Icon.Plus}
              onAction={() => push(<CreateProfile onCreated={load} />)}
            />
          </ActionPanel>
        }
      />
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          icon={{ source: Icon.PersonCircle, tintColor: Color.Blue }}
          title={profile.name}
          subtitle={profile.dataDir}
          actions={
            <ActionPanel>
              <Action
                title="Open Claude"
                icon={Icon.ArrowRight}
                onAction={() => handleLaunch(profile)}
              />
              <Action
                title="Create Profile"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<CreateProfile onCreated={load} />)}
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
                  title="Remove from List"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleRemove(profile)}
                />
                <Action
                  title="Delete Profile & Data…"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => handleDelete(profile)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
