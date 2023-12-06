import { Icon, MenuBarExtra, open, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

type Item = {
  statistics: {
    subscriberCount: string;
  };
};

type Data = {
  items: Item[];
};

export default function Command() {
  const preferences = getPreferenceValues();
  const youtubeApiKey = preferences.youtubeApiKey;
  const youtubeChannelId = preferences.youtubeChannelId;
  if (youtubeApiKey === undefined || youtubeChannelId === undefined) {
    const markdown = "API key incorrect. Please update it in extension preferences and try again.";

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  console.log(youtubeApiKey);
  console.log(youtubeChannelId);
  const { data, isLoading } = useFetch<Data>(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}&key=${youtubeApiKey}`,
  );
  if (!data || data.items.length === 0) {
    return <MenuBarExtra isLoading={isLoading} />;
  }
  const count = Number(data.items[0].statistics.subscriberCount);
  const countStr = Number(count).toLocaleString();
  LocalStorage.getItem<number>("subscribers-count").then((latestCount) => {
    const diff = count - (latestCount ?? 0);
    if (diff <= 0) {
      console.log("No change in subscriber count");
      return;
    }
    open("raycast://extensions/raycast/raycast/confetti");
  });

  LocalStorage.setItem("subscribers-count", count);
  return (
    <MenuBarExtra icon={Icon.TwoPeople} title={countStr} isLoading={isLoading}>
      <MenuBarExtra.Item
        title="Open in YouTube Studio"
        onAction={() => open(`https://studio.youtube.com/channel/${youtubeChannelId}`)}
      />
    </MenuBarExtra>
  );
}
