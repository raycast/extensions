import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { getChromeProfiles } from "../lib/chrome";
import { openLink } from "../lib/open";

interface Props {
  url: string;
  title: string;
  /** Called after Chrome opened the link, e.g. to record the visit for frecency sorting. */
  onOpen?: () => void | Promise<void>;
}

export function ProfilePicker({ url, title, onOpen }: Props) {
  const {
    data: profiles,
    isLoading,
    error,
  } = usePromise(getChromeProfiles, [], {
    failureToastOptions: { title: "Cannot read Chrome profiles" },
  });

  return (
    <List isLoading={isLoading} navigationTitle={`Open ${title} with…`} searchBarPlaceholder="Choose a Chrome profile">
      {!isLoading && !profiles?.length && (
        <List.EmptyView
          icon={Icon.Warning}
          title={error ? "Cannot Read Chrome Profiles" : "No Chrome Profiles Found"}
          description="Make sure Google Chrome is installed and has been opened at least once."
        />
      )}
      <List.Section title={title} subtitle={url}>
        {profiles?.map((profile) => (
          <List.Item
            key={profile.directory}
            icon={profile.icon}
            title={profile.name}
            subtitle={profile.email}
            accessories={[{ icon: getFavicon(url, { fallback: Icon.Globe }) }]}
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${profile.name}`}
                  icon={Icon.Globe}
                  onAction={() => openLink(url, profile.directory, onOpen)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
