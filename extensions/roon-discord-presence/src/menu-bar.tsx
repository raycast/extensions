import {
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CliNotFoundError, control, getStatus, INSTALL_HINT, LOG_FILE, summarize } from "./cli";
import { isMenuBarHidden, setMenuBarHidden } from "./visibility";

const MAX_LINE = 48; // characters per menu line; macOS menus don't wrap

function clip(text: string): string {
  return text.length > MAX_LINE ? text.slice(0, MAX_LINE - 1) + "…" : text;
}

const ICONS = {
  playing: Icon.Music,
  idle: Icon.Pause,
  stopped: Icon.Stop,
  problem: Icon.Warning,
};

export default function Command() {
  const { showTrackInMenuBar } = getPreferenceValues<{ showTrackInMenuBar?: boolean }>();
  // running the command by hand from Raycast brings a hidden icon back
  if (environment.launchType === LaunchType.UserInitiated && isMenuBarHidden()) {
    setMenuBarHidden(false, false); // we are about to render, no refresh needed
  }
  const hidden = isMenuBarHidden();
  const { data: status, error, isLoading, revalidate } = usePromise(getStatus, [], { execute: !hidden });

  if (hidden) {
    return null;
  }

  function openStatusView() {
    launchCommand({ name: "status", type: LaunchType.UserInitiated });
  }

  async function run(command: "start" | "stop" | "restart") {
    try {
      await showHUD(await control(command));
    } catch (e) {
      await showHUD(`Failed: ${(e as Error).message}`);
    }
    revalidate();
  }

  const hideItem = (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Hide Menu Bar Icon"
        tooltip="Bring it back with “Toggle Menu Bar Icon” or by running this command in Raycast"
        icon={Icon.EyeDisabled}
        onAction={async () => {
          await setMenuBarHidden(true);
          await showHUD("Menu bar icon hidden — run “Toggle Menu Bar Icon” in Raycast to show it");
        }}
      />
    </MenuBarExtra.Section>
  );

  if (error instanceof CliNotFoundError) {
    return (
      <MenuBarExtra icon={ICONS.problem} tooltip="roon-discord-presence is not installed" isLoading={isLoading}>
        <MenuBarExtra.Item title="roon-discord-presence is not installed" />
        <MenuBarExtra.Item
          title="Copy Install Command"
          icon={Icon.Clipboard}
          onAction={() => Clipboard.copy(INSTALL_HINT)}
        />
        <MenuBarExtra.Item
          title="Open Project Page"
          icon={Icon.Globe}
          onAction={() => open("https://github.com/alvinism/roon-discord-presence")}
        />
        {hideItem}
      </MenuBarExtra>
    );
  }

  const summary = status ? summarize(status) : { title: error ? "Status unavailable" : "Loading…", subtitle: "" };
  const icon =
    !status || error
      ? ICONS.problem
      : status.state === "playing"
        ? ICONS.playing
        : status.state === "stopped"
          ? ICONS.stopped
          : status.state === "idle"
            ? ICONS.idle
            : ICONS.problem;
  const playing = status?.state === "playing" ? status.playing : null;
  const lines: { title: string; icon?: Image.ImageLike }[] = playing
    ? [
        {
          title: playing.title,
          icon: playing.cover ? { source: playing.cover, mask: Image.Mask.RoundedRectangle } : Icon.Music,
        },
        { title: playing.artist, icon: Icon.Person },
        { title: playing.album, icon: Icon.Cd },
        {
          title: `${playing.zone} · ${status?.shown ? "shown on Discord" : "updating Discord…"}`,
          icon: Icon.Speaker,
        },
      ]
    : [
        { title: summary.title, icon: icon },
        ...(summary.subtitle ? [{ title: summary.subtitle }] : []),
        ...(error ? [{ title: error.message }] : []),
      ];
  const menuTitle = showTrackInMenuBar && status?.state === "playing" ? status.playing?.title : undefined;

  return (
    <MenuBarExtra icon={icon} title={menuTitle} tooltip={summary.title} isLoading={isLoading}>
      <MenuBarExtra.Section>
        {/* items need an action, or macOS greys them out; clicking opens the status view */}
        {lines.map((line, i) => (
          <MenuBarExtra.Item
            key={i}
            title={clip(line.title)}
            tooltip={line.title.length > MAX_LINE ? line.title : undefined}
            icon={line.icon}
            onAction={openStatusView}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {status?.service === "running" ? (
          <>
            <MenuBarExtra.Item title="Restart" icon={Icon.RotateClockwise} onAction={() => run("restart")} />
            <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={() => run("stop")} />
          </>
        ) : (
          <MenuBarExtra.Item title="Start" icon={Icon.Play} onAction={() => run("start")} />
        )}
        <MenuBarExtra.Item title="Open Log" icon={Icon.Document} onAction={() => open(LOG_FILE, "Console")} />
      </MenuBarExtra.Section>
      {hideItem}
    </MenuBarExtra>
  );
}
