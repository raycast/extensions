import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CliNotFoundError, control, getStatus, INSTALL_HINT, LOG_FILE, Status, summarize } from "./cli";
import { isMenuBarHidden, setMenuBarHidden } from "./visibility";

interface MenuBarToggle {
  hidden: boolean;
  toggle: () => void;
}

function Controls({
  status,
  revalidate,
  menuBar,
}: {
  status?: Status;
  revalidate: () => void;
  menuBar: MenuBarToggle;
}) {
  async function run(command: "start" | "stop" | "restart") {
    const toast = await showToast(Toast.Style.Animated, `${command[0].toUpperCase()}${command.slice(1)}ing…`);
    try {
      toast.title = await control(command);
      toast.style = Toast.Style.Success;
    } catch (e) {
      toast.title = "Failed";
      toast.message = (e as Error).message;
      toast.style = Toast.Style.Failure;
    }
    revalidate();
  }

  return (
    <ActionPanel>
      {status?.service === "running" ? (
        <>
          <Action title="Restart" icon={Icon.RotateClockwise} onAction={() => run("restart")} />
          <Action title="Stop" icon={Icon.Stop} style={Action.Style.Destructive} onAction={() => run("stop")} />
        </>
      ) : (
        <Action title="Start" icon={Icon.Play} onAction={() => run("start")} />
      )}
      <Action title="Open Log" icon={Icon.Document} onAction={() => open(LOG_FILE, "Console")} />
      <Action
        title={menuBar.hidden ? "Show Menu Bar Icon" : "Hide Menu Bar Icon"}
        icon={menuBar.hidden ? Icon.Eye : Icon.EyeDisabled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        onAction={menuBar.toggle}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

const ZONE_COLORS: Record<string, Color> = {
  playing: Color.Green,
  paused: Color.Yellow,
  loading: Color.Blue,
};

export default function Command() {
  const { data: status, error, isLoading, revalidate } = usePromise(getStatus);
  const [menuHidden, setMenuHidden] = useState(isMenuBarHidden);
  const menuBar: MenuBarToggle = {
    hidden: menuHidden,
    toggle: async () => {
      await setMenuBarHidden(!menuHidden);
      setMenuHidden(!menuHidden);
      await showToast(Toast.Style.Success, menuHidden ? "Menu bar icon shown" : "Menu bar icon hidden");
    },
  };

  if (error instanceof CliNotFoundError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="roon-discord-presence is not installed"
          description={INSTALL_HINT}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_HINT} />
              <Action.OpenInBrowser url="https://github.com/alvinism/roon-discord-presence" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const summary = status ? summarize(status) : undefined;
  const cover = status?.playing?.cover;
  const connections = status?.service === "running" && status.state !== "starting";

  return (
    <List isLoading={isLoading}>
      {error && <List.EmptyView icon={Icon.Warning} title="Status unavailable" description={error.message} />}
      {summary && (
        <List.Section title="Discord">
          <List.Item
            title={summary.title}
            subtitle={summary.subtitle}
            icon={cover ? { source: cover, mask: Image.Mask.RoundedRectangle } : Icon.Music}
            actions={<Controls status={status} revalidate={revalidate} menuBar={menuBar} />}
          />
          {connections && (
            <List.Item
              title={status.core ? `Roon Core “${status.core}”` : "Roon Core"}
              icon={Icon.Network}
              accessories={[
                {
                  tag: {
                    value: status.roon === "ok" ? "paired" : (status.roon ?? "unknown"),
                    color: status.roon === "ok" ? Color.Green : Color.Orange,
                  },
                },
                {
                  tag: {
                    value: status.discord ? "Discord connected" : "Discord closed",
                    color: status.discord ? Color.Green : Color.SecondaryText,
                  },
                },
                { text: `covers: ${status.covers}` },
              ]}
              actions={<Controls status={status} revalidate={revalidate} menuBar={menuBar} />}
            />
          )}
        </List.Section>
      )}
      {status?.zones && status.zones.length > 0 && (
        <List.Section title="Zones">
          {status.zones.map((zone) => (
            <List.Item
              key={zone.name}
              title={zone.name}
              icon={Icon.Speaker}
              accessories={[{ tag: { value: zone.state, color: ZONE_COLORS[zone.state] ?? Color.SecondaryText } }]}
              actions={<Controls status={status} revalidate={revalidate} menuBar={menuBar} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
