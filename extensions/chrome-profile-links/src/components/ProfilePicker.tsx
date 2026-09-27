import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { getChromeProfiles } from "../lib/chrome";
import { openLink } from "../lib/open";

interface Props {
  url: string;
  title: string;
  /** Called right before opening, e.g. to record the visit for frecency sorting. */
  onOpen?: () => void;
}

export function ProfilePicker({ url, title, onOpen }: Props) {
  const { data: profiles, isLoading } = usePromise(getChromeProfiles);

  return (
    <List isLoading={isLoading} navigationTitle={`Open ${title} with…`} searchBarPlaceholder="Choose a Chrome profile">
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
                  onAction={async () => {
                    onOpen?.();
                    await openLink(url, profile.directory);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
