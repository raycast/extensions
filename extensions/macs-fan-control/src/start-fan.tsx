import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import {
  CustomPreset,
  MfcError,
  PREDEFINED,
  PresetRef,
  deletePreset,
  describePreset,
  getActivePreset,
  getCustomPresets,
  isInstalled,
  isRunning,
  launchApp,
  quitApp,
} from "./lib/mfc";
import {
  Fan,
  Sensor,
  formatRpm,
  formatTemperature,
  fanLabel,
  fanLoad,
  groupSensors,
  readSmc,
} from "./lib/smc";
import { describeMac, getMacInfo } from "./lib/hardware";
import { VENDOR_URL, applyPresetWithFeedback, presetDeeplink, scratchPresetName } from "./lib/actions";
import PresetEditor from "./components/PresetEditor";
import RenamePresetForm from "./components/RenamePresetForm";

const REFRESH_MS = 2000;

type Config = {
  installed: boolean;
  running: boolean;
  active: PresetRef | null;
  presets: CustomPreset[];
};

async function loadConfig(): Promise<Config> {
  const installed = await isInstalled();
  if (!installed) return { installed: false, running: false, active: null, presets: [] };
  const [running, active, presets] = await Promise.all([isRunning(), getActivePreset(), getCustomPresets()]);
  return { installed, running, active, presets };
}

function isActive(active: PresetRef | null, ref: PresetRef): boolean {
  return active !== null && active.type === ref.type && active.index === ref.index;
}

export default function Command() {
  const config = usePromise(loadConfig);
  const smc = usePromise(readSmc);
  const mac = usePromise(getMacInfo);
  const [showDetail, setShowDetail] = useState(false);

  // Fan speeds move constantly, so keep the live half of the screen ticking.
  useEffect(() => {
    const timer = setInterval(() => smc.revalidate(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [smc.revalidate]);

  const refreshAll = () => {
    config.revalidate();
    smc.revalidate();
  };

  const cfg = config.data;
  const fans = smc.data?.fans ?? [];
  const sensors = smc.data?.sensors ?? [];

  if (cfg && !cfg.installed) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Macs Fan Control isn’t installed"
          description="This extension drives the Macs Fan Control app, which does the actual fan control."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Macs Fan Control" url={VENDOR_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  function GlobalActions() {
    return (
      <ActionPanel.Section title="Macs Fan Control">
        <Action.Push
          title="Set Fan Speed"
          icon={Icon.Gauge}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          target={
            <PresetEditor
              submitTitle="Apply Speed"
              initialName={scratchPresetName()}
              lockName
              activateAfterSave
              onSaved={refreshAll}
            />
          }
        />
        <Action.Push
          title="Create Preset"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<PresetEditor submitTitle="Create Preset" onSaved={refreshAll} />}
        />
        <Action
          title={showDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => setShowDetail((v) => !v)}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={refreshAll}
        />
        <Action
          title="Configure Extension"
          icon={Icon.Cog}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
        {cfg?.running ? (
          <Action
            title="Quit Macs Fan Control"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
            onAction={async () => {
              await quitApp();
              await showToast({
                style: Toast.Style.Success,
                title: "Macs Fan Control stopped",
                message: "Fans are back on system control",
              });
              refreshAll();
            }}
          />
        ) : (
          <Action
            title="Start Macs Fan Control"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={async () => {
              await launchApp();
              await showToast({ style: Toast.Style.Success, title: "Macs Fan Control started" });
              refreshAll();
            }}
          />
        )}
      </ActionPanel.Section>
    );
  }

  function PresetItem(props: {
    presetRef: PresetRef;
    name: string;
    subtitle: string;
    icon: Icon;
    custom?: CustomPreset;
  }) {
    const active = isActive(cfg?.active ?? null, props.presetRef);
    return (
      <List.Item
        icon={{ source: props.icon, tintColor: active ? Color.Green : Color.SecondaryText }}
        title={props.name}
        subtitle={props.subtitle}
        accessories={active ? [{ tag: { value: "Active", color: Color.Green } }] : []}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={active ? "Re-apply Preset" : "Apply Preset"}
                icon={Icon.Play}
                onAction={async () => {
                  const ok = await applyPresetWithFeedback(props.presetRef, props.name);
                  if (ok) refreshAll();
                }}
              />
              <Action.CreateQuicklink
                title="Add as Quicklink"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                quicklink={{
                  name: `Start Fan ${props.name}`,
                  link: presetDeeplink(props.name),
                }}
              />
            </ActionPanel.Section>

            {props.custom && (
              <ActionPanel.Section title="Edit">
                <Action.Push
                  title="Rename Preset"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<RenamePresetForm preset={props.custom} onRenamed={refreshAll} />}
                />
                <Action.Push
                  title="Edit Speeds"
                  icon={Icon.Gauge}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  target={
                    <PresetEditor
                      submitTitle="Save Preset"
                      initialName={props.custom.name}
                      initialFans={props.custom.fans}
                      onSaved={refreshAll}
                    />
                  }
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete “${props.custom!.name}”?`,
                      message: "This removes the preset from Macs Fan Control itself.",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Deleting…",
                    });
                    try {
                      await deletePreset(props.custom!.index);
                      toast.style = Toast.Style.Success;
                      toast.title = `Deleted “${props.custom!.name}”`;
                      refreshAll();
                    } catch (e) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Could not delete";
                      toast.message = e instanceof MfcError ? e.message : String(e);
                    }
                  }}
                />
              </ActionPanel.Section>
            )}

            <GlobalActions />
          </ActionPanel>
        }
      />
    );
  }

  async function toggleApp() {
    if (cfg?.running) {
      await quitApp();
      await showToast({
        style: Toast.Style.Success,
        title: "Macs Fan Control stopped",
        message: "Fans are back on system control",
      });
    } else {
      await launchApp();
      await showToast({ style: Toast.Style.Success, title: "Macs Fan Control started" });
    }
    refreshAll();
  }

  function fanDetail(fan: Fan) {
    const load = fanLoad(fan);
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Current" text={formatRpm(fan.actual)} />
            <List.Item.Detail.Metadata.Label title="Target" text={formatRpm(fan.target)} />
            <List.Item.Detail.Metadata.Label
              title="Control"
              text={fan.mode === 1 ? "Forced by a preset" : "System"}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Minimum" text={formatRpm(fan.min)} />
            <List.Item.Detail.Metadata.Label title="Maximum" text={formatRpm(fan.max)} />
            {load !== null && (
              <List.Item.Detail.Metadata.Label title="Of Range" text={`${Math.round(load * 100)}%`} />
            )}
            {fan.id && <List.Item.Detail.Metadata.Label title="Location" text={fan.id} />}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function sensorDetail(title: string, list: Sensor[]) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title={title} text={`${list.length} sensors`} />
            <List.Item.Detail.Metadata.Separator />
            {list.map((sensor) => (
              <List.Item.Detail.Metadata.Label
                key={sensor.key}
                title={sensor.key}
                text={formatTemperature(sensor.value)}
              />
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function fanAccessories(fan: Fan): List.Item.Accessory[] {
    const load = fanLoad(fan);
    const accessories: List.Item.Accessory[] = [];
    if (load !== null) {
      accessories.push({
        icon: getProgressIcon(load, fan.mode === 1 ? Color.Orange : Color.Blue),
        tooltip: `${Math.round(load * 100)}% of this fan's range`,
      });
    }
    accessories.push({ tag: { value: formatRpm(fan.actual), color: Color.PrimaryText } });
    return accessories;
  }

  function fanSubtitle(fan: Fan): string {
    if (fan.mode === 1) return `Forced · target ${formatRpm(fan.target)}`;
    if (fan.mode === 0) return "System control";
    return "Unknown mode";
  }

  return (
    <List
      isLoading={config.isLoading || (smc.isLoading && !smc.data)}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search presets, fans and sensors…"
    >
      <List.Section title="Macs Fan Control">
        <List.Item
          icon={{
            source: cfg?.running ? Icon.CheckCircle : Icon.Circle,
            tintColor: cfg?.running ? Color.Green : Color.SecondaryText,
          }}
          title={cfg?.running ? "Running" : "Not running"}
          subtitle={cfg?.running ? "Press ↵ to stop and hand the fans back" : "Press ↵ to start it"}
          accessories={showDetail ? [] : [{ tag: cfg?.running ? "On" : "Off" }]}
          actions={
            <ActionPanel>
              <Action
                title={cfg?.running ? "Stop Macs Fan Control" : "Start Macs Fan Control"}
                icon={cfg?.running ? Icon.Stop : Icon.Play}
                onAction={toggleApp}
              />
              <GlobalActions />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={mac.data ? describeMac(mac.data, fans.length) : "Fans"}>
        {fans.map((fan) => (
          <List.Item
            key={`fan-${fan.index}`}
            icon={{
              source: Icon.Gauge,
              tintColor: fan.mode === 1 ? Color.Orange : Color.SecondaryText,
            }}
            title={fanLabel(fan, fans.length)}
            subtitle={showDetail ? undefined : fanSubtitle(fan)}
            accessories={showDetail ? [] : fanAccessories(fan)}
            detail={fanDetail(fan)}
            actions={
              <ActionPanel>
                <GlobalActions />
              </ActionPanel>
            }
          />
        ))}
        {!smc.isLoading && fans.length === 0 && (
          <List.Item
            icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
            title="No controllable fans"
            subtitle="This Mac is cooled passively — presets have nothing to drive"
            actions={
              <ActionPanel>
                <GlobalActions />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Presets">
        {PREDEFINED.map((p) => (
          <PresetItem
            key={`pre-${p.index}`}
            presetRef={{ type: "predefined", index: p.index }}
            name={p.name}
            subtitle={p.description}
            icon={p.index === 0 ? Icon.Gauge : Icon.Bolt}
          />
        ))}
        {cfg?.presets.map((p) => (
          <PresetItem
            key={`cus-${p.index}`}
            presetRef={{ type: "custom", index: p.index }}
            name={p.name}
            subtitle={describePreset(p)}
            icon={Icon.Stars}
            custom={p}
          />
        ))}
      </List.Section>

      <List.Section title="Temperatures">
        {groupSensors(sensors).map((group) => (
          <List.Item
            key={`temp-${group.title}`}
            icon={{ source: Icon.Temperature, tintColor: Color.SecondaryText }}
            title={group.title}
            subtitle={
              showDetail
                ? undefined
                : `${group.sensors.length} sensor${group.sensors.length === 1 ? "" : "s"}`
            }
            accessories={
              showDetail ? [] : [{ tag: { value: formatTemperature(group.peak), color: Color.PrimaryText } }]
            }
            detail={sensorDetail(group.title, group.sensors)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Sensors"
                  icon={Icon.List}
                  target={
                    <List navigationTitle={`${group.title} Sensors`}>
                      {group.sensors.map((s) => (
                        <List.Item
                          key={s.key}
                          icon={Icon.Temperature}
                          title={s.key}
                          accessories={[{ text: formatTemperature(s.value) }]}
                        />
                      ))}
                    </List>
                  }
                />
                <GlobalActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
