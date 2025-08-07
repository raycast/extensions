import { getPreferenceValues, Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { Prefs } from "./preferences";
import executeApiCommand from "./api-command";
import { usePromise } from "@raycast/utils";
import { PlayerState } from "./interfaces";

export default function Command() {
  const { host, playerId } = getPreferenceValues<Prefs>();
  const { isLoading, data, revalidate } = usePromise(
    async (host: string, playerId: string) =>
      await executeApiCommand(host, async (api) => {
        const player = await api.getPlayer(playerId);
        let title;
        if (player.state !== PlayerState.PLAYING) {
          title = "";
        } else {
          const artist = player.current_media?.artist;
          const song = player.current_media?.title;
          title = `${artist} - ${song}`;
          if (!artist || !song) {
            const queue = await api.getPlayerQueue(playerId);
            if (queue.current_item) {
              title = queue.current_item?.name;
            }
          }
        }
        return {
          player,
          title,
        };
      }),
    [host, playerId],
  );

  const next = async () =>
    await executeApiCommand(host, async (api) => {
      await api.playerCommandNext(playerId);
      await revalidate();
    });

  const pause = async () =>
    await executeApiCommand(host, async (api) => {
      await api.playerCommandPlayPause(playerId);
      await revalidate();
    });

  return (
    <MenuBarExtra icon="transparent-logo.png" isLoading={isLoading} title={data?.title}>
      {data ? (
        <MenuBarExtra.Section title="Controls">
          <MenuBarExtra.Item title="Next" icon={Icon.ArrowRight} onAction={next}></MenuBarExtra.Item>
          <MenuBarExtra.Item
            title={data.player.state == PlayerState.PLAYING ? "Pause" : "Play"}
            icon={data.player.state == PlayerState.PLAYING ? Icon.Pause : Icon.Play}
            onAction={pause}
          ></MenuBarExtra.Item>
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item
          title="Fix configuration"
          icon={Icon.WrenchScrewdriver}
          onAction={openExtensionPreferences}
        ></MenuBarExtra.Item>
      )}
    </MenuBarExtra>
  );
}
