import { getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
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
        const artist = player.current_media?.artist;
        const song = player.current_media?.title;
        let title = `${artist} - ${song}`;
        if (!artist || !song) {
          const queues = await api.getPlayerQueues();
          const queue = queues.filter((q) => q.queue_id == playerId)[0];
          if (queue.current_item) {
            title = queue.current_item?.name;
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
    <MenuBarExtra icon="logo.png" isLoading={isLoading} title={data?.title}>
      <MenuBarExtra.Section title="Controls">
        <MenuBarExtra.Item title="Next" icon={Icon.ArrowRight} onAction={next}></MenuBarExtra.Item>
        <MenuBarExtra.Item
          title={data?.player.state == PlayerState.PLAYING ? "Pause" : "Play"}
          icon={data?.player.state == PlayerState.PLAYING ? Icon.Pause : Icon.Play}
          onAction={pause}
        ></MenuBarExtra.Item>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
