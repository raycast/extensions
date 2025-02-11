import { Alert, Action, ActionPanel, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { getAllItems, deleteData } from "@/utils";
import { usePromise } from "@raycast/utils";
import type { Profile } from "@/types";
import ProfileForm from "@/components/ProfileForm";
import { uniqueKey, setGitProfile } from "@/utils";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    return await getAllItems();
  });

  const handleSetProfile = async (profile: Profile) => {
    const options: Alert.Options = {
      title: "Are you sure?",
      message: `This will apply the "${profile.name}" profile. \n(scope: global)`,
      primaryAction: {
        title: "Apply",
        onAction: async () => {
          // Note: other scopes are not supported in this extension.
          await setGitProfile("global", profile);
          await showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: `${profile.name} profile applied.`,
          });
        },
      },
    };
    await confirmAlert(options);
  };

  const handleDeleteProfile = async (profile: Profile) => {
    const options: Alert.Options = {
      title: "Are you sure?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await deleteData(profile.id);
          await revalidate();
          await showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: `${profile.name} profile deleted.`,
          });
        },
      },
    };
    await confirmAlert(options);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Show the list of profiles">
      <List.Item
        title={"Create New Profile"}
        icon={Icon.PlusSquare}
        actions={
          <ActionPanel>
            <Action.Push title="Create Profile" target={<ProfileForm id={uniqueKey()} revalidate={revalidate} />} />
          </ActionPanel>
        }
      />
      <List.Section title="My Profiles">
        {data &&
          data.map((profile) => (
            <List.Item
              accessories={[{ text: profile.email }]}
              key={profile.email}
              title={profile.name}
              icon={{
                source: Icon.Bird,
                tintColor: Color.Yellow,
              }}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Bird}
                    title="Edit Profile"
                    target={<ProfileForm id={profile.id} profile={profile} revalidate={revalidate} />}
                  />
                  <Action icon={Icon.Gear} title="Apply Profile" onAction={() => handleSetProfile(profile)} />
                  <Action icon={Icon.Trash} title="Delete Profile" onAction={() => handleDeleteProfile(profile)} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
