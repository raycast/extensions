import { getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
import { Prefs } from "./preferences";
import executeApiCommand from "./api-command";
import { usePromise } from "@raycast/utils";
import { PlayerMedia, PlayerState } from "./interfaces";

export default function Command() {
  const { host, playerId } = getPreferenceValues<Prefs>();

  const { isLoading, data, revalidate } = usePromise(
    async (host: string, playerId: string) =>
      await executeApiCommand(host, async (api) => await api.getPlayer(playerId)),
    [host, playerId],
  );

  const format = (current: PlayerMedia | undefined) => `${current?.artist} - ${current?.title}`;

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
    <MenuBarExtra icon={data?.icon ?? "logo.png"} isLoading={isLoading} title={format(data?.current_media)}>
      <MenuBarExtra.Section title="Controls">
        <MenuBarExtra.Item title="Next" icon={Icon.ArrowRight} onAction={next}></MenuBarExtra.Item>
        <MenuBarExtra.Item
          title={data?.state == PlayerState.PLAYING ? "Pause" : "Play"}
          icon={data?.state == PlayerState.PLAYING ? Icon.Pause : Icon.Play}
          onAction={pause}
        ></MenuBarExtra.Item>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
