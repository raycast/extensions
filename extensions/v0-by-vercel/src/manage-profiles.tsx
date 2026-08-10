import {
  ActionPanel,
  List,
  Action,
  useNavigation,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import type { Profile, ScopeSummary } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Icon } from "@raycast/api";
import { getActiveProfileDetails } from "./lib/profile-utils";
import { useScopes } from "./hooks/useScopes";

interface Preferences {
  apiKey: string;
}

function AddProfileForm(props: { onAdd: (profile: Profile) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; apiKey: string }) {
    if (!values.name || !values.apiKey) {
      showFailureToast("Name and API Key are required.");
      return;
    }

    props.onAdd({ id: uuidv4(), name: values.name, apiKey: values.apiKey });
    showToast(Toast.Style.Success, "Profile added successfully!");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Profile Name" placeholder="e.g., My SSO Team" />
      <Form.PasswordField id="apiKey" title="API Key" placeholder="Enter your v0 API key" />
    </Form>
  );
}

function RenameProfileForm(props: { profile: Profile; onUpdate: (profile: Profile) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name) {
      showFailureToast("Profile name cannot be empty.");
      return;
    }

    props.onUpdate({
      ...props.profile,
      name: values.name,
    });
    showToast(Toast.Style.Success, `Profile renamed to "${values.name}"`);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New Profile Name"
        placeholder="Enter new name"
        defaultValue={props.profile.name}
      />
    </Form>
  );
}

function SetDefaultScopeForm(props: { profile: Profile; onUpdate: (profile: Profile) => void }) {
  const { pop } = useNavigation();
  const [selectedScopeId, setSelectedScopeId] = useState<string>(props.profile.defaultScope || "");

  const { scopes, isLoadingScopes } = useScopes(props.profile.apiKey);

  async function handleSubmit(values: { scopeId: string }) {
    const selectedScope = scopes.find((s) => s.id === values.scopeId);
    props.onUpdate({
      ...props.profile,
      defaultScope: values.scopeId || undefined,
      defaultScopeName: selectedScope?.name || undefined, // Store the scope name
    });
    showToast(
      Toast.Style.Success,
      `Default scope ${selectedScope?.name ? `set to ${selectedScope.name}` : "removed"} for ${props.profile.name}`,
    );
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Default Scope" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingScopes}
    >
      <Form.Description title="Profile" text={props.profile.name} />
      <Form.Dropdown
        id="scopeId"
        title="Default Scope"
        value={selectedScopeId}
        onChange={setSelectedScopeId}
        isLoading={isLoadingScopes}
      >
        <Form.Dropdown.Item value="" title="No Default Scope" />
        {scopes?.map((scope: ScopeSummary) => (
          <Form.Dropdown.Item key={scope.id} value={scope.id} title={scope.name || "Untitled Scope"} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function ManageProfiles() {
  const [profiles, setProfiles] = useCachedState<Profile[]>("v0-profiles", []);
  const [activeProfileId, setActiveProfileId] = useCachedState<string | undefined>("v0-active-profile-id", undefined);
  const preferences = getPreferenceValues<Preferences>();

  const { scopes: initialScopes, isLoadingScopes: isLoadingInitialScopes } = useScopes(
    preferences.apiKey,
    !profiles || profiles.length === 0,
  );

  useEffect(() => {
    async function initializeProfiles() {
      // Only run this effect if profiles are not yet loaded and initial scopes are not loading
      if (!isLoadingInitialScopes && (profiles === undefined || profiles.length === 0)) {
        if (preferences.apiKey) {
          const { defaultScope } = await getActiveProfileDetails(profiles, activeProfileId);
          const defaultScopeName = initialScopes?.find((s) => s.id === defaultScope)?.name;

          const defaultProfile: Profile = {
            id: "default",
            name: "Default Profile",
            apiKey: preferences.apiKey,
            ...(defaultScope && { defaultScope }),
            ...(defaultScopeName && { defaultScopeName }),
          };
          setProfiles([defaultProfile]);
          // Set active profile only if it's currently undefined
          setActiveProfileId((prevActiveProfileId) =>
            prevActiveProfileId === undefined ? defaultProfile.id : prevActiveProfileId,
          );
        }
      } else if (activeProfileId === undefined && profiles.length > 0) {
        // If profiles exist but no active one, set the first as active
        setActiveProfileId(profiles[0].id);
      }
    }
    initializeProfiles();
  }, [
    profiles,
    activeProfileId,
    preferences.apiKey,
    initialScopes,
    isLoadingInitialScopes,
    setProfiles,
    setActiveProfileId,
  ]);

  const handleAddProfile = (newProfile: Profile) => {
    setProfiles((prev) => [...(prev || []), newProfile]);
    if (!activeProfileId) {
      setActiveProfileId(newProfile.id);
    }
  };

  const handleSetActiveProfile = (id: string) => {
    setActiveProfileId(id);
    showToast(Toast.Style.Success, "Active profile switched!");
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfiles((prev) => prev?.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)) || []);
  };

  const handleDeleteProfile = async (id: string) => {
    if (id === "default") {
      showFailureToast("Cannot delete the default profile.");
      return;
    }

    if (
      await confirmAlert({
        title: "Delete Profile",
        message: "Are you sure you want to delete this profile? This action cannot be undone.",
        icon: Icon.Trash,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setProfiles((prev) => {
        const updatedProfiles = prev?.filter((p) => p.id !== id) || [];
        if (id === activeProfileId) {
          // If the deleted profile was active, set the first available profile as active
          setActiveProfileId(updatedProfiles.length > 0 ? updatedProfiles[0].id : undefined);
        }
        showToast(Toast.Style.Success, "Profile deleted successfully!");
        return updatedProfiles;
      });
    }
  };

  return (
    <List isLoading={isLoadingInitialScopes}>
      <List.Section title="Profiles">
        {profiles?.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={profile.defaultScopeName ? profile.defaultScopeName : undefined}
            accessories={[{ text: profile.id === activeProfileId ? "Active" : "" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Active"
                  onAction={() => handleSetActiveProfile(profile.id)}
                  icon={Icon.CheckCircle}
                />
                <Action.Push
                  title="Set Default Scope"
                  target={<SetDefaultScopeForm profile={profile} onUpdate={handleProfileUpdate} />}
                  icon={Icon.Star}
                />
                <Action.Push
                  title="Rename Profile"
                  target={<RenameProfileForm profile={profile} onUpdate={handleProfileUpdate} />}
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Add New Profile"
                    target={<AddProfileForm onAdd={handleAddProfile} />}
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  {profile.id !== "default" && (
                    <Action
                      title="Delete Profile"
                      onAction={() => handleDeleteProfile(profile.id)}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        title="No Profiles Found"
        description="Add a new profile to get started."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add New Profile"
              target={<AddProfileForm onAdd={handleAddProfile} />}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
