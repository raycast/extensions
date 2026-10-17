import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { openProfileWindow } from "./launch-profile";
import {
  createProfile,
  displayProfilePath,
  getUnlinkedProfileFolders,
  getProfiles,
  reattachProfileFolder,
  removeProfileFromList,
  renameProfile,
  type CodexProfile,
  type UnlinkedProfileFolder,
} from "./profiles";

interface ProfileFormProps {
  profile?: CodexProfile;
  onSaved: () => Promise<void>;
}

function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: Form.Values) {
    setIsLoading(true);
    try {
      const name = String(values.name ?? "");
      if (profile) {
        await renameProfile(profile.id, name);
      } else {
        await createProfile(name);
      }
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: profile ? "Profile renamed" : "Profile created",
      });
      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: profile ? "Couldn't rename profile" : "Couldn't create profile",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={profile ? "Rename Profile" : "Create Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={profile ? "Save Name" : "Create Profile"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Profile Name" defaultValue={profile?.name ?? ""} />
      {profile ? (
        <Form.Description title="Folder (unchanged)" text={displayProfilePath(profile.path)} />
      ) : (
        <Form.Description title="New folder" text="An empty profile folder will be created under ~/.codex-profiles/. No data is copied." />
      )}
    </Form>
  );
}

interface ReattachProfileFormProps {
  folder: UnlinkedProfileFolder;
  onSaved: () => Promise<void>;
}

function ReattachProfileForm({ folder, onSaved }: ReattachProfileFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: Form.Values) {
    setIsLoading(true);
    try {
      await reattachProfileFolder(folder.id, String(values.name ?? ""));
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: "Existing profile folder re-added",
        message: "Its folder and Codex data were left in place.",
      });
      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: "Couldn't re-add profile folder",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Re-add Existing Profile"
      actions={<ActionPanel><Action.SubmitForm title="Re-add Profile" onSubmit={submit} /></ActionPanel>}
    >
      <Form.TextField id="name" title="Profile Name" defaultValue={folder.suggestedName} />
      <Form.Description title="Existing folder (unchanged)" text={displayProfilePath(folder.path)} />
    </Form>
  );
}

export default function ManageProfiles() {
  const [profiles, setProfiles] = useState<CodexProfile[]>([]);
  const [unlinkedFolders, setUnlinkedFolders] = useState<UnlinkedProfileFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const reloadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedProfiles, folders] = await Promise.all([getProfiles(), getUnlinkedProfileFolders()]);
      setProfiles(loadedProfiles);
      setUnlinkedFolders(folders);
    } catch (error) {
      await showFailureToast(error, {
        title: "Couldn't load profiles",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProfiles();
  }, [reloadProfiles]);

  async function removeFromSwitcher(profile: CodexProfile) {
    const confirmed = await confirmAlert({
      title: `Remove ${profile.name} from the switcher?`,
      message: `Only its entry will be removed. The folder and all Codex data will remain at ${displayProfilePath(profile.path)}.`,
      primaryAction: {
        title: "Remove from Switcher",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;

    try {
      await removeProfileFromList(profile.id);
      await reloadProfiles();
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from switcher",
        message: "The profile folder and its data were left untouched.",
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Couldn't remove profile",
      });
    }
  }

  function showCreateForm() {
    push(<ProfileForm onSaved={reloadProfiles} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter profiles">
      <List.Item
        id="create-profile"
        title="Create Profile…"
        subtitle="Create a separate local Codex folder"
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action title="Create Profile" icon={Icon.Plus} onAction={showCreateForm} />
          </ActionPanel>
        }
      />
      {unlinkedFolders.length > 0 && (
        <List.Section title="Existing folders not linked to a profile">
          {unlinkedFolders.map((folder) => (
            <List.Item
              key={folder.id}
              id={`unlinked-${folder.id}`}
              title={folder.suggestedName}
              subtitle={displayProfilePath(folder.path)}
              actions={
                <ActionPanel>
                  <Action
                    title="Re-add Existing Folder…"
                    icon={Icon.ArrowClockwise}
                    onAction={() => push(<ReattachProfileForm folder={folder} onSaved={reloadProfiles} />)}
                  />
                  <Action.ShowInFinder path={folder.path} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          id={profile.id}
          title={profile.name}
          subtitle={displayProfilePath(profile.path)}
          accessories={profile.required ? [{ tag: "Required" }] : undefined}
          actions={
            <ActionPanel>
              <Action title={`Open ${profile.name} Window`} icon={Icon.AppWindow} onAction={() => openProfileWindow(profile)} />
              <Action
                title="Rename Profile…"
                icon={Icon.Pencil}
                onAction={() => push(<ProfileForm profile={profile} onSaved={reloadProfiles} />)}
              />
              {!profile.required && (
                <Action
                  title="Remove from Switcher"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeFromSwitcher(profile)}
                />
              )}
              <Action.ShowInFinder path={profile.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
