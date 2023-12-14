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
  const celebrationThreshold = preferences.celebrationThreshold;

  if (isNaN(celebrationThreshold)) {
    const markdown =
      "Celebration subscribers threshold is not a number. Please update it in extension preferences and try again.";

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
  const { data, isLoading } = useFetch<Data>(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}&key=${youtubeApiKey}`,
  );
  if (!data || data.items.length === 0) {
    return <MenuBarExtra isLoading={isLoading} />;
  }
  const currentCount = Number(data.items[0].statistics.subscriberCount);
  const countStr = Number(currentCount).toLocaleString();
  if (celebrationThreshold != 0) {
    LocalStorage.getItem<number>("celebrated-at-count").then((celebratedAtCount) => {
      const diff = currentCount - (celebratedAtCount ?? 0);
      if (diff < celebrationThreshold) {
        console.log("Threshold not reached yet");
        return;
      }
      open("raycast://extensions/raycast/raycast/confetti");
      LocalStorage.setItem("celebrated-at-count", currentCount);
    });
  }
  return (
    <MenuBarExtra icon={Icon.TwoPeople} title={countStr} isLoading={isLoading}>
      <MenuBarExtra.Item
        title="Open in YouTube Studio"
        onAction={() => open(`https://studio.youtube.com/channel/${youtubeChannelId}`)}
      />
    </MenuBarExtra>
  );
}
