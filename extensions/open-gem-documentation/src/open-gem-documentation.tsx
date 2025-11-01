import { List, Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  gemNamesUrl: string;
  publicGemDocUrlPattern?: string;
  privateGemDocUrlPattern?: string;
  privateGemPrefix?: string;
  privateGems?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch(preferences.gemNamesUrl, {
    keepPreviousData: true,
    parseResponse: async (response): Promise<string[]> => {
      return response.text().then((text) => {
        return text.split("\n").filter((name) => name !== "---");
      });
    },
  });

  return (
    <List isLoading={isLoading}>
      {(data || []).map((gem: string) => (
        <List.Item
          title={gem}
          icon={Icon.Box}
          key={gem}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={urlFor(gem)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function urlFor(gemName: string): string {
  const preferences = getPreferenceValues<Preferences>();

  const privateGems = (preferences.privateGems ?? "").split(",").map((name) => name.trim());

  let pattern = null;

  if (
    preferences.privateGemDocUrlPattern &&
    ((preferences.privateGemPrefix && gemName.startsWith(preferences.privateGemPrefix)) ||
      privateGems.includes(gemName))
  ) {
    pattern = preferences.privateGemDocUrlPattern;
  } else {
    pattern = preferences.publicGemDocUrlPattern;
  }

  if (!pattern) {
    throw new Error("No URL pattern configured");
  }

  return pattern.replaceAll("%gem%", gemName);
}
