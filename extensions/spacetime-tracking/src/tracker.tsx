import {
  Color,
  Icon,
  Image,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { tick, TickResult } from "./lib/tracker";
import { getActiveSession, getSessions, startSession, stopActiveSession } from "./lib/storage";
import { sessionCsvFilename, sessionToCsv } from "./lib/csv";
import { formatDuration, sessionTotalSeconds, spaceInfoName, spaceKey, SpaceInfo } from "./lib/format";
import { listSpaces, mainDisplay } from "./lib/native";
import { switchToSpace } from "./lib/spaceSwitch";
import { ensureSwitchDefaults } from "./lib/desktopShortcuts";
import { markMenuBarActive } from "./lib/menubar";
import { promptSaveLocation } from "./lib/dialog";
import { maybeAutoStartDailySession } from "./lib/notify";
import { Session } from "./lib/types";

interface State {
  result: TickResult;
  session?: Session;
  spaces: SpaceInfo[];
}

export default function Command() {
  const [state, setState] = useState<State>();
  const [loading, setLoading] = useState(true);
  const prefs = getPreferenceValues<Preferences>();

  async function refresh() {
    markMenuBarActive(); // the icon is registered as soon as this command renders
    await maybeAutoStartDailySession(); // auto-start today's session first, if enabled
    const result = await tick();
    const session = await getActiveSession();
    let spaces: SpaceInfo[] = [];
    try {
      ensureSwitchDefaults(); // enable the macOS "Switch to Desktop N" shortcuts (once)
      spaces = listSpaces().filter((s) => s.display === mainDisplay());
    } catch {
      spaces = [];
    }
    setState({ result, session, spaces });
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const status = state?.result.status ?? "idle";
  const session = state?.session;
  const spaces = state?.spaces ?? [];
  const activeId = state?.result.currentSpace?.id;

  const { icon, title } = menuBarSummary(state);

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={loading} tooltip="Spacetime Tracking">
      {status === "idle" && <MenuBarExtra.Item title="No active session" icon={Icon.Circle} />}

      {session && (
        <>
          <MenuBarExtra.Section title={session.name}>
            <MenuBarExtra.Item title={`Status: ${statusLabel(status)}`} icon={statusIcon(status)} />
            <MenuBarExtra.Item title={`Total: ${formatDuration(sessionTotalSeconds(session))}`} icon={Icon.Clock} />
            {state?.result.currentSpace && (
              <MenuBarExtra.Item title={`Current: ${spaceInfoName(state.result.currentSpace)}`} icon={Icon.Desktop} />
            )}
            {state?.result.error && <MenuBarExtra.Item title={state.result.error} icon={Icon.Warning} />}
          </MenuBarExtra.Section>
        </>
      )}

      <MenuBarExtra.Section title="Session">
        <MenuBarExtra.Item
          title="New Session"
          icon={Icon.Play}
          onAction={async () => {
            await tick(); // flush time into any current session before replacing it
            await startSession();
            await tick();
            await refresh(); // re-render the menu bar with the new state right away
          }}
        />
        {status !== "idle" && (
          <MenuBarExtra.Item
            title="Stop Session"
            icon={Icon.Stop}
            onAction={async () => {
              await tick(); // flush final delta
              const savedPath = await stopActiveSession();
              if (savedPath) await showHUD(`Session saved to ${savedPath}`);
              await refresh();
            }}
          />
        )}
        <MenuBarExtra.Item
          title="Export Last Session"
          icon={Icon.Download}
          onAction={async () => {
            const all = await getSessions();
            if (all.length === 0) {
              await showHUD("No session to export");
              return;
            }
            const last = [...all].sort((a, b) => b.startedAt - a.startedAt)[0];
            const path = await promptSaveLocation(sessionCsvFilename(last), join(homedir(), "Downloads"));
            if (!path) {
              await showHUD("Export cancelled");
              return;
            }
            try {
              writeFileSync(path, sessionToCsv(last), "utf8");
              await showHUD(`Exported "${last.name}" to ${path}`);
            } catch (err) {
              await showHUD(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
        />
      </MenuBarExtra.Section>

      {spaces.length > 0 && (
        <MenuBarExtra.Section title="Spaces">
          {spaces.map((sp) => {
            const isCurrent = sp.id === activeId;
            const seconds = session?.spaces[spaceKey(sp)]?.seconds ?? 0;
            const time = seconds > 0 ? formatDuration(seconds) : undefined;
            // Subtitle shows the recorded time; the current space is also marked.
            const subtitle = isCurrent ? (time ? `${time} · current` : "current") : time;
            return (
              <MenuBarExtra.Item
                key={sp.id}
                title={spaceInfoName(sp)}
                icon={isCurrent ? { source: Icon.CircleFilled, tintColor: Color.Green } : Icon.Desktop}
                subtitle={subtitle}
                onAction={async () => {
                  try {
                    await switchToSpace(sp.index);
                  } catch (err) {
                    await showHUD(err instanceof Error ? err.message : String(err));
                  }
                }}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Rename Space…"
          icon={Icon.Pencil}
          onAction={async () => {
            await launchCommand({ name: "name-current", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Setup…"
          icon={Icon.Wand}
          onAction={async () => {
            await launchCommand({ name: "setup", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Open Sessions…"
          icon={Icon.List}
          onAction={async () => {
            await launchCommand({ name: "sessions", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Settings…"
          icon={Icon.Gear}
          subtitle={prefs.inactivityEnabled ? `idle pause @ ${prefs.inactivityMinutes}m` : "idle pause off"}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Brand glyph shown in the menu bar (tinted per status; PrimaryText adapts to light/dark).
const MENU_BAR_ICON = "menubar-icon.png";

function menuBarSummary(state?: State): { icon: Image.ImageLike; title?: string } {
  const status = state?.result.status ?? "idle";
  switch (status) {
    case "tracking":
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.Green } };
    case "paused":
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.Yellow }, title: "Paused" };
    case "auto-paused":
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.Yellow }, title: "Idle" };
    case "other-display":
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.SecondaryText } };
    case "error":
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.Red } };
    default:
      return { icon: { source: MENU_BAR_ICON, tintColor: Color.PrimaryText } };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "tracking":
      return "Tracking";
    case "paused":
      return "Paused";
    case "auto-paused":
      return "Auto-paused (idle)";
    case "other-display":
      return "Not recording (other display)";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function statusIcon(status: string): Icon {
  switch (status) {
    case "tracking":
      return Icon.CircleFilled;
    case "paused":
      return Icon.Pause;
    case "auto-paused":
      return Icon.Moon;
    case "other-display":
      return Icon.Monitor;
    case "error":
      return Icon.Warning;
    default:
      return Icon.Circle;
  }
}
