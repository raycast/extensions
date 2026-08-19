import {
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  showInFinder,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ensureDiagnosticLog } from "./diagnostics";
import { defaultConfiguration, formatHeight } from "./model";
import { NativeEvent, readDesk } from "./native";
import { positionIcons } from "./position-icons";
import {
  CachedDeskStatus,
  getCachedDeskStatus,
  getConfiguration,
  getPresets,
} from "./storage";

type DeskState = {
  height?: number;
  name?: string;
  updatedAt?: number;
};

type DeskStatusError = {
  message: string;
  occurredAt: number;
};

type DeskCommandName =
  "sit" | "stand" | "raise" | "lower" | "stop" | "save-sit" | "save-stand";

const initialDeskState: DeskState = {};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deskStateFromCache(status: CachedDeskStatus): DeskState {
  return {
    height: status.heightCm,
    name: status.deskName,
    updatedAt: status.updatedAt,
  };
}

function formatStatusAge(updatedAt: number): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - updatedAt) / 1_000),
  );
  if (elapsedSeconds < 10) return "Updated just now";
  if (elapsedSeconds < 60) return `Updated ${elapsedSeconds}s ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  return `Updated at ${new Date(updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function Command() {
  const [configuration, setConfiguration] = useState(defaultConfiguration());
  const [desk, setDesk] = useState<DeskState>(initialDeskState);
  const [presets, setPresets] = useState({ sit: 70, stand: 110 });
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusError, setStatusError] = useState<DeskStatusError>();

  const acceptEvent = useCallback((event: NativeEvent) => {
    if (event.event === "error") return;
    setDesk((current) => ({
      height: event.heightCm ?? current.height,
      name: event.deskName ?? current.name,
      updatedAt: event.heightCm === undefined ? current.updatedAt : Date.now(),
    }));
  }, []);

  const loadStoredState = useCallback(async () => {
    try {
      const [savedConfiguration, savedPresets, cachedStatus] =
        await Promise.all([
          getConfiguration(),
          getPresets(),
          getCachedDeskStatus(),
        ]);
      setConfiguration(savedConfiguration);
      setPresets(savedPresets);
      if (cachedStatus) {
        setDesk(deskStateFromCache(cachedStatus));
        setStatusError((current) =>
          current && cachedStatus.updatedAt > current.occurredAt
            ? undefined
            : current,
        );
      }
    } catch {
      // Keep the safe defaults when local state cannot be read.
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    void loadStoredState();
    const timer = setInterval(() => void loadStoredState(), 2_000);
    return () => clearInterval(timer);
  }, [loadStoredState]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setStatusError(undefined);
    try {
      const [savedConfiguration, savedPresets, event] = await Promise.all([
        getConfiguration(),
        getPresets(),
        readDesk(acceptEvent),
      ]);
      setConfiguration(savedConfiguration);
      setPresets(savedPresets);
      acceptEvent(event);
    } catch (error) {
      setStatusError({ message: errorMessage(error), occurredAt: Date.now() });
    } finally {
      setIsRefreshing(false);
    }
  }, [acceptEvent]);

  function launchDeskCommand(name: DeskCommandName): Promise<void> {
    return launchCommand({ name, type: LaunchType.UserInitiated });
  }

  async function showDiagnosticLog(): Promise<void> {
    const logPath = await ensureDiagnosticLog();
    await showInFinder(logPath);
  }

  const hasCachedStatus =
    desk.height !== undefined && desk.updatedAt !== undefined;
  const statusTitle = isRefreshing
    ? "Connecting to desk…"
    : statusError
      ? "Desk unavailable"
      : hasCachedStatus
        ? "Last known position"
        : "Ready";
  const statusSubtitle = statusError
    ? statusError.message
    : desk.height !== undefined && desk.updatedAt !== undefined
      ? `${desk.name ?? "Desk"} · ${formatHeight(desk.height)} · ${formatStatusAge(desk.updatedAt)}`
      : "Select a position or refresh the height";
  const actionsDisabled = isInitializing || isRefreshing;

  return (
    <MenuBarExtra
      icon={{ source: "menu-bar-icon.svg", tintColor: Color.PrimaryText }}
      tooltip="Standing Desk"
      isLoading={isInitializing || isRefreshing}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={
            isRefreshing
              ? Icon.CircleProgress
              : statusError
                ? { source: Icon.WifiDisabled, tintColor: Color.Red }
                : hasCachedStatus
                  ? Icon.Clock
                  : Icon.Desktop
          }
          title={statusTitle}
          subtitle={statusSubtitle}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Positions">
        <MenuBarExtra.Item
          icon={positionIcons.sit}
          title="Sit"
          subtitle={formatHeight(presets.sit)}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={
            actionsDisabled ? undefined : () => launchDeskCommand("sit")
          }
        />
        <MenuBarExtra.Item
          icon={positionIcons.stand}
          title="Stand"
          subtitle={formatHeight(presets.stand)}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={
            actionsDisabled ? undefined : () => launchDeskCommand("stand")
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Adjust">
        <MenuBarExtra.Item
          icon={Icon.ArrowUp}
          title="Raise"
          subtitle={formatHeight(configuration.stepHeight)}
          shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
          onAction={
            actionsDisabled ? undefined : () => launchDeskCommand("raise")
          }
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowDown}
          title="Lower"
          subtitle={formatHeight(configuration.stepHeight)}
          shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
          onAction={
            actionsDisabled ? undefined : () => launchDeskCommand("lower")
          }
        />
        <MenuBarExtra.Item
          icon={{ source: Icon.Stop, tintColor: Color.Red }}
          title="Stop"
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => launchDeskCommand("stop")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu icon={Icon.Pin} title="Save Current Position">
          <MenuBarExtra.Item
            title="Save as Sit"
            subtitle={formatHeight(presets.sit)}
            onAction={
              actionsDisabled ? undefined : () => launchDeskCommand("save-sit")
            }
          />
          <MenuBarExtra.Item
            title="Save as Stand"
            subtitle={formatHeight(presets.stand)}
            onAction={
              actionsDisabled
                ? undefined
                : () => launchDeskCommand("save-stand")
            }
          />
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh Height"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={actionsDisabled ? undefined : refresh}
        />
        <MenuBarExtra.Item
          icon={Icon.AppWindow}
          title="Open Desk Manager"
          onAction={() =>
            launchCommand({
              name: "manage-desk",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.Document}
          title="Show Diagnostic Log"
          onAction={showDiagnosticLog}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
