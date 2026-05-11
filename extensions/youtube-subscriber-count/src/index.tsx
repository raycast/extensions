import { Icon, MenuBarExtra, open, LocalStorage, Color, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

type Items = {
  items: [
    {
      statistics: {
        subscriberCount: string;
      };
    },
  ];
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const youtubeApiKey = preferences.youtubeApiKey;
  const youtubeChannelId = preferences.youtubeChannelId;
  const celebrationThreshold = preferences.celebrationThreshold;
  const localeFormat = preferences.localeFormat;

  const { data, isLoading, error } = useFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}&key=${youtubeApiKey}`,
    {
      async parseResponse(response) {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = (await response.json()) as Items;

        if (data.items) {
          const currentCount = Number(data.items[0].statistics.subscriberCount);
          const countStr = localeFormat ? Number(currentCount).toLocaleString() : currentCount;

          if (parseInt(celebrationThreshold) > 0) {
            LocalStorage.getItem<number>("celebrated-at-count").then((celebratedAtCount) => {
              const diff = currentCount - (celebratedAtCount ?? 0);
              if (diff <= Number(celebrationThreshold)) {
                return;
              }

              open("raycast://extensions/raycast/raycast/confetti");
              LocalStorage.setItem("celebrated-at-count", currentCount);
            });
          }

          return countStr;
        } else {
          throw new Error("Check Credentials");
        }
      },
    },
  );

  return (
    <MenuBarExtra
      icon={{ source: Icon.TwoPeople, tintColor: error ? Color.Red : Color.PrimaryText }}
      title={error ? "Check Credentials" : data?.toString()}
      isLoading={isLoading}
    >
      {!error && (
        <MenuBarExtra.Item
          title="Open in YouTube Studio"
          icon={Icon.Globe}
          onAction={() => open(`https://studio.youtube.com/channel/${youtubeChannelId}`)}
        />
      )}

      <MenuBarExtra.Item
        title="Open Extension Preferences"
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra>
  );
}
