import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";
import { useProfileContext } from "@src/hooks";
import { StripeProfile } from "@src/types";
import { withProfileContext } from "@src/components";

const PROFILE_COLORS = [
  { name: "Stripe Purple", value: "#635BFF" },
  { name: "Blue", value: "#0070F3" },
  { name: "Green", value: "#50E3C2" },
  { name: "Orange", value: "#F5A623" },
  { name: "Red", value: "#F03E3E" },
  { name: "Pink", value: "#F81CE5" },
  { name: "Yellow", value: "#FFD60A" },
  { name: "Teal", value: "#14B8A6" },
];

interface ProfileFormProps {
  profile?: StripeProfile;
  onSubmit: (profile: any) => Promise<void>;
}

const ProfileForm = ({ profile, onSubmit }: ProfileFormProps) => {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async (values: {
    name: string;
    testApiKey: string;
    liveApiKey: string;
    accountId: string;
    color: string;
  }) => {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }

    try {
      if (profile) {
        // Update existing profile
        await onSubmit({
          id: profile.id,
          name: values.name,
          testApiKey: values.testApiKey || undefined,
          liveApiKey: values.liveApiKey || undefined,
          accountId: values.accountId || undefined,
          color: values.color,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Profile Updated",
          message: values.name,
        });
      } else {
        // Create new profile
        await onSubmit({
          name: values.name,
          testApiKey: values.testApiKey || undefined,
          liveApiKey: values.liveApiKey || undefined,
          accountId: values.accountId || undefined,
          color: values.color,
          isDefault: false,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Profile Created",
          message: values.name,
        });
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to save profile",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={profile ? "Update Profile" : "Create Profile"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="My Business Account"
        defaultValue={profile?.name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />

      <Form.Separator />

      <Form.PasswordField
        id="testApiKey"
        title="Test API Key"
        placeholder="sk_test_..."
        defaultValue={profile?.testApiKey}
      />

      <Form.PasswordField
        id="liveApiKey"
        title="Live API Key"
        placeholder="sk_live_..."
        defaultValue={profile?.liveApiKey}
      />

      <Form.Separator />

      <Form.TextField
        id="accountId"
        title="Account ID (Optional)"
        placeholder="acct_..."
        defaultValue={profile?.accountId}
        info="For reference only - helps identify connected accounts"
      />

      <Form.Dropdown id="color" title="Color" defaultValue={profile?.color || PROFILE_COLORS[0].value}>
        {PROFILE_COLORS.map((color) => (
          <Form.Dropdown.Item key={color.value} value={color.value} title={color.name} />
        ))}
      </Form.Dropdown>

      <Form.Description text="💡 Tip: You can get your API keys from the Stripe Dashboard under Developers > API Keys" />
    </Form>
  );
};

const ManageProfiles = () => {
  const { profiles, activeProfile, addProfile, updateProfile, deleteProfile, setActiveProfile } = useProfileContext();
  const { push } = useNavigation();

  const handleCreateProfile = async (profileData: Omit<StripeProfile, "id">) => {
    await addProfile(profileData);
  };

  const handleUpdateProfile = async (data: { id: string } & Partial<StripeProfile>) => {
    const { id, ...updates } = data;
    await updateProfile(id, updates);
  };

  const handleDeleteProfile = async (profile: StripeProfile) => {
    if (profiles.length <= 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Delete",
        message: "You must have at least one profile",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Profile?",
      message: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await deleteProfile(profile.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Profile Deleted",
      message: profile.name,
    });
  };

  return (
    <List navigationTitle="Manage Stripe Accounts" searchBarPlaceholder="Search profiles...">
      <List.Section title="Profiles">
        {profiles.map((profile) => {
          const isActive = activeProfile?.id === profile.id;
          const hasTestKey = !!profile.testApiKey;
          const hasLiveKey = !!profile.liveApiKey;

          const accessories = [];
          if (hasTestKey) accessories.push({ tag: { value: "Test", color: Color.Blue } });
          if (hasLiveKey) accessories.push({ tag: { value: "Live", color: Color.Green } });
          if (isActive) accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green } });

          return (
            <List.Item
              key={profile.id}
              title={profile.name}
              subtitle={profile.accountId}
              icon={{ source: Icon.Circle, tintColor: profile.color as Color.ColorLike }}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {!isActive && (
                      <Action
                        title="Set as Active"
                        icon={Icon.CheckCircle}
                        onAction={() => setActiveProfile(profile.id)}
                      />
                    )}
                    <Action
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      onAction={() => push(<ProfileForm profile={profile} onSubmit={handleUpdateProfile} />)}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Test Api Key"
                      content={profile.testApiKey || ""}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Live Api Key"
                      content={profile.liveApiKey || ""}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Profile"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteProfile(profile)}
                      shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Add New Profile"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Create Profile"
                icon={Icon.Plus}
                onAction={() => push(<ProfileForm onSubmit={handleCreateProfile} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};

export default withProfileContext(ManageProfiles, { skipGuide: true });
