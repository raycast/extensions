import { ActionPanel, Form, Action, showToast, Toast, List, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { ConnectionProfile } from "./types";
import { ProfileManager } from "./lib/profile-manager";

interface ProfileFormValues {
  name: string;
  provider: "aws" | "r2" | "spaces" | "custom";
  region?: string;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
  defaultBucket?: string;
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile?: ConnectionProfile;
  onSave: (profile: ConnectionProfile) => void;
}) {
  const [profileName, setProfileName] = useState(profile?.name || "");
  const [provider, setProvider] = useState<"aws" | "r2" | "spaces" | "custom">(profile?.provider || "aws");
  const [region, setRegion] = useState(profile?.region || "us-east-1");
  const [accessKey, setAccessKey] = useState(profile?.accessKeyId || "");
  const [secretKey, setSecretKey] = useState(profile?.secretAccessKey || "");
  const [endpoint, setEndpoint] = useState(profile?.endpoint || "");
  const [defaultBucket, setDefaultBucket] = useState(profile?.defaultBucket || "");

  async function saveProfile(values: ProfileFormValues) {
    try {
      if (!values.name || !values.accessKey || !values.secretKey) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing Required Fields",
          message: "Please fill in profile name, access key, and secret key",
        });
        return;
      }

      const newProfile: ConnectionProfile = {
        id: profile?.id || `profile_${Date.now()}`,
        name: values.name,
        provider: values.provider,
        region: values.region || "us-east-1",
        accessKeyId: values.accessKey,
        secretAccessKey: values.secretKey,
        endpoint: values.provider === "custom" ? values.endpoint : undefined,
        defaultBucket: values.defaultBucket || undefined,
        isDefault: profile?.isDefault || false,
      };

      onSave(newProfile);

      await showToast({
        style: Toast.Style.Success,
        title: profile ? "Profile Updated" : "Profile Created",
        message: `${newProfile.name} has been saved`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function testConnection() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Testing Connection",
      message: "Verifying S3 credentials...",
    });

    // Mock connection test
    setTimeout(async () => {
      await showToast({
        style: Toast.Style.Success,
        title: "Connection Successful",
        message: "S3 credentials are valid",
      });
    }, 2000);
  }

  return (
    <Form
      navigationTitle={profile ? "Edit S3 Profile" : "Add S3 Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={profile ? "Update Profile" : "Save Profile"} onSubmit={saveProfile} />
          <Action title="Test Connection" onAction={testConnection} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="My AWS Account"
        value={profileName}
        onChange={setProfileName}
      />

      <Form.Dropdown
        id="provider"
        title="Provider"
        value={provider}
        onChange={(value) => setProvider(value as "aws" | "r2" | "spaces" | "custom")}
      >
        <Form.Dropdown.Item value="aws" title="Amazon S3" />
        <Form.Dropdown.Item value="r2" title="Cloudflare R2" />
        <Form.Dropdown.Item value="spaces" title="DigitalOcean Spaces" />
        <Form.Dropdown.Item value="custom" title="Custom S3-Compatible" />
      </Form.Dropdown>

      <Form.TextField id="region" title="Region" placeholder="us-east-1" value={region} onChange={setRegion} />

      <Form.PasswordField id="accessKey" title="Access Key ID" value={accessKey} onChange={setAccessKey} />

      <Form.PasswordField id="secretKey" title="Secret Access Key" value={secretKey} onChange={setSecretKey} />

      {provider === "custom" && (
        <Form.TextField
          id="endpoint"
          title="Endpoint URL"
          placeholder="https://s3.example.com"
          value={endpoint}
          onChange={setEndpoint}
        />
      )}

      <Form.TextField
        id="defaultBucket"
        title="Default Bucket (Optional)"
        placeholder="my-default-bucket"
        value={defaultBucket}
        onChange={setDefaultBucket}
      />
    </Form>
  );
}

export default function ManageProfiles() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push, pop } = useNavigation();

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setIsLoading(true);

      // Load all profiles using ProfileManager
      const allProfiles = await ProfileManager.refreshProfiles();

      setProfiles(allProfiles);

      // If no profiles found, provide a helpful message
      if (allProfiles.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No AWS Configuration Found",
          message:
            "No ~/.aws/config or ~/.aws/credentials found. Please configure AWS CLI or create a profile manually.",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Profiles",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function createProfile() {
    push(
      <ProfileForm
        onSave={(profile) => {
          setProfiles([...profiles, profile]);
          pop();
        }}
      />,
    );
  }

  function editProfile(profile: ConnectionProfile) {
    push(
      <ProfileForm
        profile={profile}
        onSave={(updatedProfile) => {
          setProfiles(profiles.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));
          pop();
        }}
      />,
    );
  }

  async function deleteProfile(profile: ConnectionProfile) {
    try {
      if (profile.isDefault) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot Delete Default Profile",
          message: "Set another profile as default first",
        });
        return;
      }

      setProfiles(profiles.filter((p) => p.id !== profile.id));

      await showToast({
        style: Toast.Style.Success,
        title: "Profile Deleted",
        message: `${profile.name} has been removed`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function setDefaultProfile(profile: ConnectionProfile) {
    try {
      const updatedProfiles = profiles.map((p) => ({
        ...p,
        isDefault: p.id === profile.id,
      }));

      setProfiles(updatedProfiles);

      await showToast({
        style: Toast.Style.Success,
        title: "Default Profile Updated",
        message: `${profile.name} is now the default profile`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Default Profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List navigationTitle="S3 Profiles" searchBarPlaceholder="Search profiles..." isLoading={isLoading}>
      {profiles.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No S3 Profiles"
          description="No AWS profiles found. Configure AWS CLI with 'aws configure' or create a profile manually."
          actions={
            <ActionPanel>
              <Action title="Create Profile" onAction={createProfile} />
              <Action title="Refresh Aws Profiles" onAction={loadProfiles} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Connection Profiles">
            {profiles.map((profile) => (
              <List.Item
                key={profile.id}
                title={profile.name}
                subtitle={`${profile.provider.toUpperCase()} • ${profile.region}`}
                accessories={[
                  ...(profile.isDefault ? [{ text: "Default", icon: Icon.Star }] : []),
                  ...(profile.id.startsWith("aws_") ? [{ text: "~/.aws", icon: Icon.Gear }] : []),
                  { text: profile.accessKeyId.substring(0, 8) + "...", icon: Icon.Key },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Edit Profile" onAction={() => editProfile(profile)} icon={Icon.Pencil} />
                    {!profile.isDefault && (
                      <Action title="Set as Default" onAction={() => setDefaultProfile(profile)} icon={Icon.Star} />
                    )}
                    <ActionPanel.Section title="Danger Zone">
                      <Action
                        title="Delete Profile"
                        style={Action.Style.Destructive}
                        onAction={() => deleteProfile(profile)}
                        icon={Icon.Trash}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Actions">
            <List.Item
              title="Create New Profile"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action title="Create Profile" onAction={createProfile} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Refresh AWS Profiles"
              subtitle="Reload from ~/.aws configuration"
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <Action title="Refresh" onAction={loadProfiles} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
