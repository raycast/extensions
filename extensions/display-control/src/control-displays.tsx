import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoalescedAdjustments, PressAcceleration } from "./lib/adjustment-input";
import { controlPanelMarkdown } from "./lib/control-panel";
import type { ResetDefaults } from "./lib/controls";
import { initialDefaults, controlLabels as labels, parseResetDefault } from "./lib/controls";
import type { Control, DisplayState, Reading } from "./lib/m1ddc";
import { controls } from "./lib/m1ddc";
import type { Monitor } from "./lib/monitors";
import { MonitorService } from "./lib/monitors";
import { executeNative } from "./native";

const brewStoreUrl = "raycast://extensions/nhojb/brew?source=webstore";
const icons: Record<Control, Icon> = { volume: Icon.SpeakerUp, luminance: Icon.Sun, contrast: Icon.Contrast };
const modifiers: Record<Control, Keyboard.KeyModifier[]> = {
  volume: ["cmd"],
  luminance: ["cmd", "shift"],
  contrast: ["cmd", "opt"],
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const step = [1, 5, 10].includes(Number(preferences.step)) ? Number(preferences.step) : 1;
  const defaults: ResetDefaults = {
    volume: parseResetDefault(preferences.defaultVolume, initialDefaults.volume),
    luminance: parseResetDefault(preferences.defaultBrightness, initialDefaults.luminance),
    contrast: parseResetDefault(preferences.defaultContrast, initialDefaults.contrast),
  };
  const service = useMemo(() => new MonitorService(executeNative, preferences.m1ddcPath), [preferences.m1ddcPath]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, DisplayState>>({});
  const [writeCount, setWriteCount] = useState(0);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const reading = useRef<AbortController | null>(null);
  const refreshing = useRef(false);
  const discoveryRun = useRef(0);
  const writes = useRef(new Set<Promise<unknown>>());
  const acceleration = useRef(new PressAcceleration());
  const adjustmentQueue = useRef(new CoalescedAdjustments());
  const {
    data: discovery,
    error: failure,
    isLoading: isDiscovering,
    revalidate,
  } = usePromise(
    async (currentService: MonitorService) => {
      const run = ++discoveryRun.current;
      refreshing.current = true;
      acceleration.current.reset();
      adjustmentQueue.current.clear();
      reading.current?.abort();
      try {
        await Promise.allSettled([...writes.current]);
        return await currentService.discover();
      } finally {
        if (run === discoveryRun.current) refreshing.current = false;
      }
    },
    [service],
    {
      onData(result) {
        setValues(
          Object.fromEntries(
            result.monitors.flatMap((monitor) => {
              const state = service.getState(monitor.id);
              return state ? [[monitor.id, state]] : [];
            }),
          ),
        );
        setSelectedId((previous) =>
          result.monitors.some((monitor) => monitor.id === previous) ? previous : (result.monitors[0]?.id ?? null),
        );
      },
      failureToastOptions: { title: "Could Not Load Displays" },
    },
  );
  const needsSetup = discovery?.m1ddcMissing && !setupDismissed;
  const selected =
    isDiscovering || needsSetup ? undefined : discovery?.monitors.find((monitor) => monitor.id === selectedId);
  const { isLoading: isReading } = usePromise(
    async (currentService: MonitorService, monitor: Monitor | undefined) => {
      if (!monitor) return;
      const state = await currentService.readControls(monitor, reading.current?.signal);
      return { id: monitor.id, state };
    },
    [service, selected],
    {
      abortable: reading,
      execute: !!selected,
      onData(result) {
        if (result) {
          const state = service.getState(result.id) ?? result.state;
          setValues((previous) => ({ ...previous, [result.id]: state }));
        }
      },
      failureToastOptions: { title: "Could Not Read Display" },
    },
  );

  async function refresh() {
    if (!refreshing.current) await revalidate();
  }

  useEffect(() => {
    const queue = adjustmentQueue.current;
    return () => queue.clear();
  }, []);

  async function updateControl(monitor: Monitor, control: Control, update: () => Promise<Reading>) {
    if (refreshing.current) return false;
    setWriteCount((count) => count + 1);
    const operation = update();
    writes.current.add(operation);
    try {
      await operation;
      return true;
    } catch (error) {
      await showFailureToast(error, { title: `Could Not Adjust ${labels[control]}` });
      return false;
    } finally {
      const state = service.getState(monitor.id);
      if (state) setValues((previous) => ({ ...previous, [monitor.id]: state }));
      writes.current.delete(operation);
      setWriteCount((count) => count - 1);
    }
  }

  function adjust(monitor: Monitor, control: Control, direction: -1 | 1) {
    if (refreshing.current) return;
    const target = `${monitor.id}/${control}`;
    const acceleratedStep = acceleration.current.nextStep(target, direction, step);
    void adjustmentQueue.current
      .enqueue(target, async () => {
        const succeeded = await updateControl(monitor, control, () =>
          service.adjust(monitor, control, direction, acceleratedStep),
        );
        if (!succeeded) {
          acceleration.current.reset();
          adjustmentQueue.current.clear();
        }
      })
      .catch((error) => {
        acceleration.current.reset();
        void showFailureToast(error, { title: "Could Not Adjust Display" });
      });
  }

  async function reset(monitor: Monitor, selectedControls: Control[]) {
    acceleration.current.reset();
    adjustmentQueue.current.clear();
    const invalid = selectedControls.find((control) => defaults[control] === undefined);
    if (invalid) {
      await showFailureToast(new Error("Enter a whole percentage from 0 to 100 in extension preferences."), {
        title: `Invalid Default ${labels[invalid]}`,
        primaryAction: { title: "Open Preferences", onAction: openExtensionPreferences },
      });
      return;
    }
    for (const control of selectedControls) {
      await updateControl(monitor, control, () => service.set(monitor, control, defaults[control]!));
    }
  }

  async function installWithBrew() {
    try {
      await launchCommand({
        ownerOrAuthorName: "nhojb",
        extensionName: "brew",
        name: "search",
        type: LaunchType.UserInitiated,
        arguments: { search: "m1ddc" },
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Could Not Open Brew",
        message: "Install and enable the Brew extension, and allow Raycast to open its Search command.",
        primaryAction: { title: "Get Brew Extension", onAction: () => open(brewStoreUrl) },
      });
    }
  }

  const utilityActions = (
    <ActionPanel.Section>
      <Action
        title="Refresh Displays"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {discovery?.m1ddcMissing && <Action title="Install with Brew" icon={Icon.Download} onAction={installWithBrew} />}
      <Action.OpenInBrowser title="Open Documentation" url="https://github.com/waydabber/m1ddc" />
    </ActionPanel.Section>
  );

  if (needsSetup) {
    const builtIn = discovery.monitors.find((monitor) => monitor.builtIn);
    return (
      <Detail
        isLoading={isDiscovering}
        markdown={
          "# Install m1ddc\n\nDisplay Control needs m1ddc to adjust external monitors.\n\nChoose **Install with Brew** to open Raycast's Brew extension with **m1ddc** already entered. Select the **m1ddc formula** and press **⌘ I** to install it inside Raycast.\n\nIf you do not have the Brew extension, choose **Get Brew Extension** first.\n\nAfter installation, reopen **Control Displays**. It will detect m1ddc automatically.\n\nIf you already installed m1ddc elsewhere, set its path in extension preferences.\n\nYour Mac's built-in display and speaker controls work without m1ddc."
        }
        actions={
          <ActionPanel>
            <Action title="Install with Brew" icon={Icon.Download} onAction={installWithBrew} />
            <Action.Open title="Get Brew Extension" icon={Icon.RaycastLogoNeg} target={brewStoreUrl} />
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
            {builtIn && (
              <Action
                title="Continue with Built-in Display"
                icon={Icon.Monitor}
                onAction={() => {
                  setSelectedId(builtIn.id);
                  setSetupDismissed(true);
                }}
              />
            )}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isShowingDetail
      isLoading={isDiscovering || isReading || writeCount > 0}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={(id) => {
        if (id !== selectedId) {
          acceleration.current.reset();
          adjustmentQueue.current.clear();
        }
        setSelectedId(id);
      }}
      searchBarPlaceholder="Search displays"
    >
      <List.EmptyView
        icon={Icon.Desktop}
        title={isDiscovering ? "Finding Displays" : failure ? "Could Not Load Displays" : "No Displays Found"}
        description={failure?.message ?? discovery?.warning ?? "Connect a display, then press Command-R to refresh."}
        actions={<ActionPanel>{utilityActions}</ActionPanel>}
      />
      {discovery?.monitors.map((monitor) => (
        <List.Item
          key={monitor.id}
          id={monitor.id}
          title={monitor.name}
          icon={monitor.builtIn ? Icon.Monitor : Icon.Desktop}
          keywords={[monitor.builtIn ? "built-in internal" : "external", monitor.id]}
          accessories={
            monitor.builtIn
              ? [{ tag: "Built-in" }]
              : !monitor.ddc
                ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange } }]
                : []
          }
          detail={
            <MonitorDetail
              monitor={monitor}
              state={values[monitor.id]}
              warning={discovery.warning}
              step={step}
              defaults={defaults}
            />
          }
          actions={
            <ActionPanel title={monitor.name}>
              {controls.map((control) =>
                values[monitor.id]?.[control]?.reading ? (
                  <ActionPanel.Section key={control} title={labels[control]}>
                    {([1, -1] as const).map((direction) => (
                      <Action
                        key={direction}
                        title={`${direction > 0 ? "Increase" : "Decrease"} ${labels[control]}`}
                        icon={icons[control]}
                        shortcut={{ modifiers: modifiers[control], key: direction > 0 ? "=" : "-" }}
                        onAction={() => adjust(monitor, control, direction)}
                      />
                    ))}
                    <Action
                      title={`Reset ${labels[control]} to Default`}
                      icon={Icon.Undo}
                      shortcut={{ modifiers: modifiers[control], key: "0" }}
                      onAction={() => reset(monitor, [control])}
                    />
                  </ActionPanel.Section>
                ) : null,
              )}
              {controls.some((control) => values[monitor.id]?.[control]?.reading) && (
                <ActionPanel.Section title="Defaults">
                  <Action
                    title="Reset All Controls"
                    icon={Icon.Undo}
                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "0" }}
                    onAction={() =>
                      reset(
                        monitor,
                        controls.filter((control) => values[monitor.id]?.[control]?.reading),
                      )
                    }
                  />
                </ActionPanel.Section>
              )}
              {utilityActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function MonitorDetail({
  monitor,
  state,
  warning,
  step,
  defaults,
}: {
  monitor: Monitor;
  state?: DisplayState;
  warning?: string;
  step: number;
  defaults: ResetDefaults;
}) {
  const errors = controls.flatMap((control) => {
    if (monitor.builtIn && control === "contrast") return [];
    const value = state?.[control];
    return [
      ...(value?.error ? [`**${labels[control]}:** ${value.error.replace(/[\r\n]+/g, " ")}`] : []),
      ...(value?.reading?.unconfirmed
        ? [`**${labels[control]}:** The displayed level is the requested value. The display has not confirmed it yet.`]
        : value?.reading && value.error
          ? [`**${labels[control]}:** The displayed level is the last confirmed value.`]
          : []),
    ];
  });
  const accelerationHint =
    step < 10
      ? `Hold down the key to accelerate up to 10%. Pausing restores the ${step}% base step.`
      : "The step is at the 10% acceleration limit.";
  const markdown = [
    controlPanelMarkdown(state, defaults),
    `${monitor.builtIn ? "Built-in display" : "External display"} · Base step ${step}%  \n*${accelerationHint}*`,
    ...(errors.length ? ["### Control Status", ...errors] : []),
    ...(!monitor.builtIn && warning ? [`### Setup\n${warning}`] : []),
  ].join("\n\n");

  return <List.Item.Detail markdown={markdown} />;
}
