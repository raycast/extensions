import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { apiPut, getBaseUrl, TypeWhisperError } from "./api";
import type { ProfilesResponse } from "./types";

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<ProfilesResponse>(
    `${getBaseUrl()}/v1/profiles`,
    {
      keepPreviousData: true,
    },
  );

  async function toggleProfile(id: string, name: string) {
    try {
      await apiPut("/v1/profiles/toggle", { id });
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: `Toggled "${name}"`,
      });
    } catch (error) {
      const msg =
        error instanceof TypeWhisperError
          ? error.message
          : "Failed to toggle profile";
      await showToast({ style: Toast.Style.Failure, title: msg });
    }
  }

  const profiles = data?.profiles ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {profiles.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No profiles configured"
          description="Create profiles in TypeWhisper Settings > Profiles"
          icon={Icon.Person}
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={profile.bundle_identifiers.join(", ") || undefined}
            icon={
              profile.is_enabled
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[
              ...(profile.input_language
                ? [
                    {
                      tag: { value: profile.input_language, color: Color.Blue },
                    },
                  ]
                : []),
              ...(profile.url_patterns.length > 0
                ? [{ text: profile.url_patterns.join(", "), icon: Icon.Globe }]
                : []),
              { text: profile.is_enabled ? "Enabled" : "Disabled" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={
                    profile.is_enabled ? "Disable Profile" : "Enable Profile"
                  }
                  icon={profile.is_enabled ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggleProfile(profile.id, profile.name)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
