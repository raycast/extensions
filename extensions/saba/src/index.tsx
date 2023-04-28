import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, showToast, Toast, showHUD, Icon, LocalStorage } from "@raycast/api";
import { useExec, useFetch } from "@raycast/utils";
import { Channel } from "./types/Channel";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { apiUrl } from "./utils/apiUrl";
import { ErrorState } from "./components/ErrorState";

const Command = () => {
  const [activeChannelId, setActiveChannelId] = useState("");
  const [activeChannelUrl, setActiveChannelUrl] = useState("");
  const { isLoading, data, error, revalidate } = useFetch<{ [key: string]: Channel[] }>(`${apiUrl}/channels`);

  if (error) {
    return <ErrorState error={error} onAction={revalidate} />;
  }

  const channelsIds = Object.keys(data || {});
  const channels = channelsIds.map((channelId) => data?.[channelId][0]) as Channel[];
  const activeChannel = channels.find((channel) => channel?.tvgId === activeChannelId);

  useEffect(() => {
    const parseUrl = async (url: string) => {
      const username = (await LocalStorage.getItem<string>("username")) || "";
      const token = (await LocalStorage.getItem<string>("token")) || "";

      const splitUrl = url?.split("/");
      splitUrl[3] = username;
      splitUrl[4] = token;

      setActiveChannelUrl(splitUrl.join("/"));
    };

    const activeChannel = channels.find((channel) => channel?.tvgId === activeChannelId);
    if (activeChannel) {
      parseUrl(activeChannel.url);
    }
  }, [activeChannelId]);

  const { mutate: play } = useExec(
    "osascript",
    ["-e", `'tell application "VLC" to activate openURL "${activeChannelUrl}"'`],
    {
      shell: true,
      execute: false,
      onData: async () => {
        await showHUD(`Playing ${activeChannel?.title}`);
      },
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Play",
          message: error.message,
        });
      },
    }
  );

  return (
    <SubscriptionGuard>
      <Grid
        isLoading={isLoading || !data}
        inset={Grid.Inset.Small}
        aspectRatio="4/3"
        columns={5}
        onSelectionChange={(id) => setActiveChannelId(id || "")}
      >
        <Grid.Section title="Channels">
          {channels.map(({ tvgId, logoUrl, title }) => (
            <Grid.Item
              id={tvgId}
              key={tvgId}
              content={logoUrl}
              keywords={[title]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Play} title="Play" onAction={play} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      </Grid>
    </SubscriptionGuard>
  );
};

export default Command;
