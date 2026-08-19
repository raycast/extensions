import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureDiagnosticLog } from "./diagnostics";
import { forgetDeskSession } from "./desk-session";
import { ensureSafetyAcknowledgement } from "./safety";
import {
  defaultConfiguration,
  DeskConfiguration,
  formatHeight,
  parseHeight,
  validateTarget,
} from "./model";
import { moveDesk, NativeEvent, nudgeDesk, readDesk, stopDesk } from "./native";
import { positionIcons } from "./position-icons";
import SettingsForm from "./settings-form";
import {
  DeskSettings,
  getConfiguration,
  getPresets,
  PresetName,
  savePreset,
} from "./storage";

type DeskState = {
  connected: boolean;
  name?: string;
  identifier?: string;
  height?: number;
  speed?: number;
};

const initialDeskState: DeskState = { connected: false };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Command() {
  const [configuration, setConfiguration] = useState(defaultConfiguration());
  const [desk, setDesk] = useState<DeskState>(initialDeskState);
  const [presets, setPresets] = useState({ sit: 70, stand: 110 });
  const [statusError, setStatusError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const viewGeneration = useRef(0);

  const acceptEvent = useCallback((event: NativeEvent) => {
    if (event.event === "error") return;
    setDesk((current) => ({
      connected: event.connected ?? current.connected,
      name: event.deskName ?? current.name,
      identifier: event.identifier ?? current.identifier,
      height: event.heightCm ?? current.height,
      speed: event.speed ?? current.speed,
    }));
  }, []);

  const refresh = useCallback(async () => {
    const generation = ++viewGeneration.current;
    setIsLoading(true);
    setStatusError(undefined);
    try {
      const [savedConfiguration, savedPresets] = await Promise.all([
        getConfiguration(),
        getPresets(),
        readDesk((event) => {
          if (viewGeneration.current === generation) acceptEvent(event);
        }),
      ]);
      if (viewGeneration.current !== generation) return;
      setConfiguration(savedConfiguration);
      setPresets(savedPresets);
    } catch (error) {
      if (viewGeneration.current !== generation) return;
      setStatusError(errorMessage(error));
      setDesk((current) => ({ ...current, connected: false }));
    } finally {
      if (viewGeneration.current === generation) setIsLoading(false);
    }
  }, [acceptEvent]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function performMove(target: number, label: string) {
    if (!(await ensureSafetyAcknowledgement())) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Moving desk to ${label}`,
      message: formatHeight(target),
    });
    setIsMoving(true);
    setStatusError(undefined);
    const generation = viewGeneration.current;
    try {
      const event = await moveDesk(target, (nativeEvent) => {
        if (viewGeneration.current === generation) acceptEvent(nativeEvent);
      });
      toast.style = Toast.Style.Success;
      toast.title =
        event.outcome === "stopped"
          ? "Stop command sent"
          : `Desk moved to ${label}`;
      toast.message =
        event.outcome === "stopped"
          ? "Use the physical control if the desk is still moving."
          : event.heightCm === undefined
            ? ""
            : formatHeight(event.heightCm);
    } catch (error) {
      const message = errorMessage(error);
      if (viewGeneration.current === generation) setStatusError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not move desk";
      toast.message = message;
    } finally {
      setIsMoving(false);
    }
  }

  async function performNudge(direction: "up" | "down") {
    if (!(await ensureSafetyAcknowledgement())) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: direction === "up" ? "Raising desk" : "Lowering desk",
    });
    setIsMoving(true);
    setStatusError(undefined);
    const generation = viewGeneration.current;
    try {
      const event = await nudgeDesk(direction, (nativeEvent) => {
        if (viewGeneration.current === generation) acceptEvent(nativeEvent);
      });
      toast.style = Toast.Style.Success;
      toast.title =
        event.outcome === "stopped" ? "Stop command sent" : "Desk adjusted";
      toast.message =
        event.outcome === "stopped"
          ? "Use the physical control if the desk is still moving."
          : event.heightCm === undefined
            ? ""
            : formatHeight(event.heightCm);
    } catch (error) {
      const message = errorMessage(error);
      if (viewGeneration.current === generation) setStatusError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not adjust desk";
      toast.message = message;
    } finally {
      setIsMoving(false);
    }
  }

  async function performStop() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping desk",
    });
    const generation = viewGeneration.current;
    try {
      await stopDesk((nativeEvent) => {
        if (viewGeneration.current === generation) acceptEvent(nativeEvent);
      });
      toast.style = Toast.Style.Success;
      toast.title = "Stop command sent";
      toast.message = "Use the physical control if the desk is still moving.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not contact desk";
      toast.message = `${errorMessage(error)} Use the physical control if needed.`;
    }
  }

  async function saveCurrentPosition(name: PresetName) {
    if (desk.height === undefined) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Desk height is unavailable",
        message: "Refresh the desk, then save the position again.",
      });
      return;
    }
    await savePreset(name, desk.height);
    setPresets((current) => ({ ...current, [name]: desk.height as number }));
    await showToast({
      style: Toast.Style.Success,
      title: `Saved ${name === "sit" ? "Sit" : "Stand"} position`,
      message: formatHeight(desk.height),
    });
  }

  async function forgetDesk() {
    try {
      await forgetDeskSession();
      viewGeneration.current += 1;
      setDesk(initialDeskState);
      setStatusError(undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Forgot connected desk",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not forget desk",
        message: errorMessage(error),
      });
    }
  }

  async function showDiagnosticLog() {
    const logPath = await ensureDiagnosticLog();
    await showInFinder(logPath);
  }

  function acceptSettings(settings: DeskSettings, hasSelectedDesk: boolean) {
    viewGeneration.current += 1;
    setConfiguration(settings.configuration);
    setPresets(settings.presets);
    setDesk(initialDeskState);
    setStatusError(undefined);
    if (hasSelectedDesk) {
      void refresh();
    }
  }

  const settingsForm = (
    <SettingsForm
      initialSettings={{ configuration, presets }}
      onSaved={acceptSettings}
    />
  );

  const sharedActions = (
    <>
      <Action
        title="Stop Desk"
        icon={{ source: Icon.Stop, tintColor: Color.Red }}
        onAction={performStop}
      />
      <Action
        title="Refresh Height"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action.Push
        title="Desk Settings"
        icon={Icon.Gear}
        target={settingsForm}
      />
      <Action
        title="Show Diagnostic Log"
        icon={Icon.Document}
        onAction={showDiagnosticLog}
      />
      <Action
        title="Forget Connected Desk"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={forgetDesk}
      />
    </>
  );

  const heightTitle =
    desk.height === undefined ? "Reading height…" : formatHeight(desk.height);
  const connectionSubtitle = desk.connected
    ? `${desk.name ?? "Desk"}${isMoving ? " · Moving" : " · Connected"}`
    : (statusError ?? "Searching for the desk");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a desk action">
      <List.Section title="Desk">
        <List.Item
          icon={{
            source: desk.connected ? Icon.CheckCircle : Icon.WifiDisabled,
            tintColor: desk.connected ? Color.Green : Color.Red,
          }}
          title={desk.connected ? heightTitle : "Desk unavailable"}
          subtitle={connectionSubtitle}
          accessories={
            desk.speed && Math.abs(desk.speed) > 0.01
              ? [{ text: `${desk.speed.toFixed(1)} cm/s` }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Height"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action
                title="Stop Desk"
                icon={{ source: Icon.Stop, tintColor: Color.Red }}
                onAction={performStop}
              />
              <Action.Push
                title="Desk Settings"
                icon={Icon.Gear}
                target={settingsForm}
              />
              <Action
                title="Show Diagnostic Log"
                icon={Icon.Document}
                onAction={showDiagnosticLog}
              />
              <Action
                title="Forget Connected Desk"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={forgetDesk}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Positions">
        <List.Item
          icon={{ source: positionIcons.sit, tintColor: Color.Blue }}
          title="Sit"
          subtitle="Saved sitting position"
          accessories={[{ text: formatHeight(presets.sit) }]}
          actions={
            <ActionPanel>
              <Action
                title="Move to Sit"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "1" }}
                onAction={() => performMove(presets.sit, "Sit")}
              />
              <Action
                title="Save Current Height as Sit"
                icon={Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                onAction={() => saveCurrentPosition("sit")}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: positionIcons.stand, tintColor: Color.Green }}
          title="Stand"
          subtitle="Saved standing position"
          accessories={[{ text: formatHeight(presets.stand) }]}
          actions={
            <ActionPanel>
              <Action
                title="Move to Stand"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd"], key: "2" }}
                onAction={() => performMove(presets.stand, "Stand")}
              />
              <Action
                title="Save Current Height as Stand"
                icon={Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                onAction={() => saveCurrentPosition("stand")}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Adjust">
        <List.Item
          icon={Icon.ArrowUp}
          title="Raise Desk"
          subtitle={`Move up ${formatHeight(configuration.stepHeight)}`}
          actions={
            <ActionPanel>
              <Action
                title="Raise Desk"
                icon={Icon.ArrowUp}
                onAction={() => performNudge("up")}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ArrowDown}
          title="Lower Desk"
          subtitle={`Move down ${formatHeight(configuration.stepHeight)}`}
          actions={
            <ActionPanel>
              <Action
                title="Lower Desk"
                icon={Icon.ArrowDown}
                onAction={() => performNudge("down")}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Ruler}
          title="Move to Height…"
          subtitle={`Allowed range: ${formatHeight(configuration.minimumHeight)}–${formatHeight(configuration.maximumHeight)}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Height"
                icon={Icon.Ruler}
                target={
                  <HeightForm
                    currentHeight={desk.height}
                    configuration={configuration}
                    onMove={(height) =>
                      performMove(height, formatHeight(height))
                    }
                  />
                }
              />
              {sharedActions}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Settings and Diagnostics">
        <List.Item
          icon={Icon.Gear}
          title="Desk Settings"
          subtitle="Edit limits and positions, or restore defaults"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Desk Settings"
                icon={Icon.Gear}
                target={settingsForm}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Document}
          title="Diagnostic Log"
          subtitle="Show the persisted extension log in Finder"
          actions={
            <ActionPanel>
              <Action
                title="Show Diagnostic Log"
                icon={Icon.Document}
                onAction={showDiagnosticLog}
              />
              {sharedActions}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function HeightForm({
  currentHeight,
  configuration,
  onMove,
}: {
  currentHeight?: number;
  configuration: DeskConfiguration;
  onMove: (height: number) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [height, setHeight] = useState(
    currentHeight === undefined ? "" : currentHeight.toFixed(1),
  );
  const [error, setError] = useState<string>();

  async function submit() {
    try {
      const target = validateTarget(
        parseHeight(height, "Target height"),
        configuration,
      );
      setError(undefined);
      pop();
      await onMove(target);
    } catch (submissionError) {
      setError(errorMessage(submissionError));
    }
  }

  return (
    <Form
      navigationTitle="Move Desk to Height"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Move Desk"
            icon={Icon.Ruler}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="height"
        title="Height"
        placeholder="Height in centimeters"
        value={height}
        error={error}
        onChange={(value) => {
          setHeight(value);
          setError(undefined);
        }}
      />
      <Form.Description
        text={`Enter a value from ${formatHeight(configuration.minimumHeight)} to ${formatHeight(configuration.maximumHeight)}.`}
      />
    </Form>
  );
}
