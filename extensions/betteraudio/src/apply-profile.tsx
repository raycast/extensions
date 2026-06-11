import {
  Action,
  ActionPanel,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listProfiles, applyProfile } from "./lib/cli";
import { ErrorView } from "./components/ErrorView";

export default function Command() {
  const { data: profiles, error, isLoading } = useCachedPromise(listProfiles);

  if (error) return <ErrorView error={error} />;

  if (!isLoading && (!profiles || profiles.length === 0)) {
    return (
      <List>
        <List.EmptyView
          title="No Profiles"
          description="Create profiles in BetterAudio to quickly switch between audio setups."
          icon={Icon.Document}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {profiles?.map((profile) => (
        <List.Item
          key={profile.id}
          title={profile.name}
          subtitle={`${profile.appCount} app${profile.appCount !== 1 ? "s" : ""}`}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Apply Profile"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  try {
                    const msg = await applyProfile(profile.name);
                    await showToast({ style: Toast.Style.Success, title: msg });
                    await popToRoot();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to apply profile",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
