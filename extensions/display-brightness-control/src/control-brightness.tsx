import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SetBrightnessForm, { SetBrightnessSubmitRequest } from "./components/SetBrightnessForm";
import { BrightnessUpdateRequest, resolveBrightnessUpdate } from "./lib/brightness-update";
import {
  clampBrightness,
  DisplayInfo,
  ensureLunarReady,
  getDisplays,
  getLunarSetupCommands,
  installLunarDependencies,
  LunarError,
  setBrightnessForDisplay,
} from "./lib/lunar";

const BRIGHTNESS_STEP = 10;
const METER_WIDTH = 10;
const FILLED_RECT = "▮";
const EMPTY_RECT = "▯";

function getErrorMessage(error: unknown): string {
  if (error instanceof LunarError) {
    if (error.stderr?.trim()) {
      return error.stderr.trim();
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}

function buildMeter(value: number): string {
  const clamped = clampBrightness(value);
  const filled = Math.round((clamped / 100) * METER_WIDTH);
  const empty = METER_WIDTH - filled;
  return `${FILLED_RECT.repeat(filled)}${EMPTY_RECT.repeat(empty)}`;
}

function shortSerial(serial: string): string {
  if (serial.length <= 8) return serial;
  return `…${serial.slice(-6)}`;
}

function getDisplaySubtitle(display: DisplayInfo, duplicateNameCount: number): string | undefined {
  const parts: string[] = [isBuiltInDisplay(display) ? "Built-in" : "External"];
  if (display.transport) {
    parts.push(display.transport);
  }
  if (duplicateNameCount > 1) {
    parts.push(shortSerial(display.serial));
  }

  return parts.join(" • ");
}

function getDisplayIcon(display: DisplayInfo): Icon {
  if (isBuiltInDisplay(display)) {
    return Icon.Desktop;
  }

  return Icon.Monitor;
}

function isBuiltInDisplay(display: DisplayInfo): boolean {
  const normalizedName = display.name.trim().toLowerCase();
  const isBuiltInName = normalizedName === "built-in display";
  const isBuiltInId = display.id === "1";
  const isInternalTransport = display.transport?.toLowerCase() === "internal";
  return isBuiltInName || isBuiltInId || isInternalTransport;
}

function withDisplayBrightness(displays: DisplayInfo[], serial: string, brightness: number): DisplayInfo[] {
  return displays.map((display) => (display.serial === serial ? { ...display, brightness } : display));
}

function buildAccessories(display: DisplayInfo, isPending: boolean): List.Item.Accessory[] {
  const accessories: Array<List.Item.Accessory | null> = [
    display.main ? { tag: { value: "Main", color: Color.Green } } : null,
    display.adaptive ? { tag: { value: "Adaptive", color: Color.Yellow } } : null,
    isPending ? { icon: Icon.Clock } : null,
    { text: `${`${display.brightness}`.padStart(3, " ")}% ${buildMeter(display.brightness)}` },
  ];

  return accessories.filter((accessory): accessory is List.Item.Accessory => accessory !== null);
}

export default function Command() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isInstallingLunar, setIsInstallingLunar] = useState<boolean>(false);
  const [emptyMessage, setEmptyMessage] = useState<string>("Setting up Lunar...");
  const [pendingBySerial, setPendingBySerial] = useState<Record<string, boolean>>({});
  const displaysRef = useRef<DisplayInfo[]>([]);
  const pendingRef = useRef<Record<string, boolean>>({});
  const refreshGenRef = useRef(0);

  useEffect(() => {
    displaysRef.current = displays;
  }, [displays]);

  useEffect(() => {
    pendingRef.current = pendingBySerial;
  }, [pendingBySerial]);

  const setPending = useCallback((serial: string, pending: boolean) => {
    setPendingBySerial((previous) => ({ ...previous, [serial]: pending }));
  }, []);

  const refreshDisplays = useCallback(async (options: { showLoading?: boolean; showFailureToast?: boolean } = {}) => {
    const { showLoading = true, showFailureToast = true } = options;
    const gen = ++refreshGenRef.current;
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const nextDisplays = await getDisplays();
      if (gen !== refreshGenRef.current) return;
      setDisplays(nextDisplays);
      setPendingBySerial((prev) => {
        const activeSerials = new Set(nextDisplays.map((d) => d.serial));
        const pruned: Record<string, boolean> = {};
        for (const [serial, value] of Object.entries(prev)) {
          if (activeSerials.has(serial)) {
            pruned[serial] = value;
          }
        }
        return pruned;
      });
      if (nextDisplays.length === 0) {
        setEmptyMessage("No active displays found. Connect a display and try refreshing.");
      } else {
        setEmptyMessage("");
      }
    } catch (error) {
      if (gen !== refreshGenRef.current) return;
      setEmptyMessage((previous) => (displaysRef.current.length === 0 ? getErrorMessage(error) : previous));
      if (showFailureToast) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Displays",
          message: getErrorMessage(error),
        });
      }
    } finally {
      if (showLoading && gen === refreshGenRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setIsInstallingLunar(false);
    setEmptyMessage("Checking Lunar setup...");

    const ready = await ensureLunarReady();
    if (!ready) {
      setIsReady(false);
      setDisplays([]);
      setIsLoading(false);
      setEmptyMessage("Install Lunar.app and Lunar CLI, then run Retry Setup.");
      return;
    }

    setIsReady(true);
    await refreshDisplays();
  }, [refreshDisplays]);

  const installLunarAutomatically = useCallback(async () => {
    if (isInstallingLunar) {
      return;
    }

    setIsInstallingLunar(true);
    setIsLoading(true);
    setEmptyMessage("Installing Lunar...");

    const installed = await installLunarDependencies();
    if (installed) {
      await initialize();
      return;
    }

    setIsInstallingLunar(false);
    setIsLoading(false);
    setIsReady(false);
    setEmptyMessage("Automatic setup failed. Use setup actions below, then retry.");
  }, [initialize, isInstallingLunar]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const buildUpdateRequest = useCallback(
    (request: SetBrightnessSubmitRequest): BrightnessUpdateRequest => ({
      serial: request.serial,
      displayName: request.name,
      displayAdaptive: request.adaptive,
      requestedBrightness: request.value,
    }),
    [],
  );

  const updateDisplayBrightness = useCallback(
    async (request: BrightnessUpdateRequest): Promise<boolean> => {
      const resolved = resolveBrightnessUpdate(displaysRef.current, request);
      if (resolved.shouldSkip) {
        return false;
      }

      if (pendingRef.current[resolved.serial]) {
        return false;
      }

      setPending(resolved.serial, true);
      setDisplays((previousDisplays) =>
        withDisplayBrightness(previousDisplays, resolved.serial, resolved.nextBrightness),
      );

      try {
        await setBrightnessForDisplay(resolved.serial, resolved.nextBrightness, resolved.displayAdaptive);
        await showToast({
          style: Toast.Style.Success,
          title: `${resolved.displayName} Updated`,
          message: `${resolved.currentBrightness}% -> ${resolved.nextBrightness}%`,
        });
        return true;
      } catch (error) {
        setDisplays((previousDisplays) =>
          withDisplayBrightness(previousDisplays, resolved.serial, resolved.currentBrightness),
        );

        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to Update ${resolved.displayName}`,
          message: getErrorMessage(error),
        });
        void refreshDisplays({ showLoading: false, showFailureToast: false });
        return false;
      } finally {
        setPending(resolved.serial, false);
      }
    },
    [refreshDisplays, setPending],
  );

  const renderEmptyView = () => {
    const title = isReady ? "No Displays Found" : "Lunar Not Ready";
    const description = emptyMessage || "Try again.";

    return (
      <List.EmptyView
        title={title}
        description={description}
        actions={
          <ActionPanel>
            {!isReady ? (
              <Action
                title={isInstallingLunar ? "Installing Lunar…" : "Install Lunar"}
                onAction={() => void installLunarAutomatically()}
              />
            ) : null}
            <Action
              title={isReady ? "Refresh Displays" : "Retry Setup"}
              onAction={isReady ? () => void refreshDisplays() : () => void initialize()}
            />
            {!isReady ? <Action.CopyToClipboard title="Copy Setup Commands" content={getLunarSetupCommands()} /> : null}
            {!isReady ? <Action.OpenInBrowser title="Open Lunar Website" url="https://lunar.fyi/" /> : null}
          </ActionPanel>
        }
      />
    );
  };

  const nameCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const display of displays) {
      map.set(display.name, (map.get(display.name) ?? 0) + 1);
    }
    return map;
  }, [displays]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays...">
      {displays.length === 0 ? (
        renderEmptyView()
      ) : (
        <List.Section title="Displays">
          {displays.map((display) => {
            const isPending = Boolean(pendingBySerial[display.serial]);
            const accessories = buildAccessories(display, isPending);
            const subtitle = getDisplaySubtitle(display, nameCount.get(display.name) ?? 1);

            return (
              <List.Item
                key={display.serial}
                title={display.name}
                subtitle={subtitle}
                icon={getDisplayIcon(display)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Set Brightness"
                      icon={Icon.Pencil}
                      target={
                        <SetBrightnessForm
                          displaySerial={display.serial}
                          displayName={display.name}
                          displayAdaptive={display.adaptive}
                          initialBrightness={display.brightness}
                          onSubmit={async (request) => updateDisplayBrightness(buildUpdateRequest(request))}
                        />
                      }
                    />
                    <Action
                      title="Increase Brightness"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                      onAction={() =>
                        void updateDisplayBrightness({
                          serial: display.serial,
                          displayName: display.name,
                          displayAdaptive: display.adaptive,
                          requestedBrightness: display.brightness + BRIGHTNESS_STEP,
                        })
                      }
                    />
                    <Action
                      title="Decrease Brightness"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={() =>
                        void updateDisplayBrightness({
                          serial: display.serial,
                          displayName: display.name,
                          displayAdaptive: display.adaptive,
                          requestedBrightness: display.brightness - BRIGHTNESS_STEP,
                        })
                      }
                    />
                    <Action
                      title="Set to 100%"
                      icon={Icon.Sun}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                      onAction={() =>
                        void updateDisplayBrightness({
                          serial: display.serial,
                          displayName: display.name,
                          displayAdaptive: display.adaptive,
                          requestedBrightness: 100,
                        })
                      }
                    />
                    <Action
                      title="Set to 50%"
                      icon={Icon.CircleProgress50}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() =>
                        void updateDisplayBrightness({
                          serial: display.serial,
                          displayName: display.name,
                          displayAdaptive: display.adaptive,
                          requestedBrightness: 50,
                        })
                      }
                    />
                    <Action
                      title="Set to 0%"
                      icon={Icon.Moon}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                      onAction={() =>
                        void updateDisplayBrightness({
                          serial: display.serial,
                          displayName: display.name,
                          displayAdaptive: display.adaptive,
                          requestedBrightness: 0,
                        })
                      }
                    />
                    <Action
                      title="Refresh Displays"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => void refreshDisplays()}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
