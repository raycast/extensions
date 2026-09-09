import { Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { callOp, CliampNotRunningError, getSnapshot, startDaemon, trackLabel } from "./lib/ipc";

function truncate(s: string, n = 32): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function MenuBar() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    try {
      return await getSnapshot();
    } catch (e) {
      if (e instanceof CliampNotRunningError) return null;
      throw e;
    }
  });

  async function run(operation: string, params: Record<string, unknown> = {}) {
    await callOp(operation, params);
    revalidate();
  }

  if (error || data === null) {
    return (
      <MenuBarExtra icon={Icon.Music} tooltip="cliamp (not running)" isLoading={isLoading}>
        <MenuBarExtra.Item title="cliamp is not running" />
        <MenuBarExtra.Item
          title="Start Daemon"
          icon={Icon.Play}
          onAction={async () => {
            await startDaemon();
            revalidate();
          }}
        />
      </MenuBarExtra>
    );
  }

  const playing = data?.state === "playing";
  const track = data?.track ?? data?.logical_track;
  const title = playing && track ? truncate(trackLabel(track)) : undefined;

  return (
    <MenuBarExtra
      icon={playing ? Icon.Play : Icon.Music}
      title={title}
      tooltip={track ? trackLabel(track) : "cliamp"}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={track ? trackLabel(track) : "Nothing loaded"} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={playing ? "Pause" : "Play"}
        icon={playing ? Icon.Pause : Icon.Play}
        onAction={() => run("toggle")}
      />
      <MenuBarExtra.Item title="Next" icon={Icon.Forward} onAction={() => run("next")} />
      <MenuBarExtra.Item title="Previous" icon={Icon.Rewind} onAction={() => run("prev")} />
      <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={() => run("stop")} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Volume Up" icon={Icon.SpeakerUp} onAction={() => run("volume.adjust", { value: 3 })} />
      <MenuBarExtra.Item
        title="Volume Down"
        icon={Icon.SpeakerDown}
        onAction={() => run("volume.adjust", { value: -3 })}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Now Playing"
        icon={Icon.AppWindow}
        onAction={() => launchCommand({ name: "now-playing", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item title="cliamp Website" icon={Icon.Globe} onAction={() => open("https://www.cliamp.stream/")} />
    </MenuBarExtra>
  );
}
