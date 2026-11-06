import { Action, ActionPanel, Form, Icon, List, useNavigation, Alert, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "./lib/preferences";
import { getSavedDevices } from "./lib/storage";
import { getInstructionSettings, saveInstructionSettings } from "./lib/instruction-store";
import { EMPTY_INSTRUCTION_SETTINGS, normalizeInstructionName, type InstructionSettings } from "./lib/instructions";
import { describeRokuError } from "./lib/roku";
import type { RokuApp, RokuDevice } from "./lib/types";

type Changed = () => void | Promise<void>;
const SUPPORTED =
  "Local instructions support commands such as ‘open YouTube in the kitchen’, ‘switch Living Room to PS5’, ‘lower volume three steps’, and ‘run gaming mode’. Join commands with ‘then’ or ‘and’; each clause uses its named TV or the selected default. Use ‘toggle mute’ or ‘play/pause’ for controls whose current state cannot be verified. All steps are previewed before they run. These settings are saved aliases and protection rules; arbitrary prose is not executed.";

export default function InstructionsSettings({
  onChanged,
  navigationTitle,
}: { onChanged?: Changed; navigationTitle?: string } = {}) {
  const [devices, setDevices] = useState<RokuDevice[]>([]);
  const [settings, setSettings] = useState<InstructionSettings>(EMPTY_INSTRUCTION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [saved, prefs] = await Promise.all([getSavedDevices(), getInstructionSettings()]);
      setDevices(saved);
      setSettings(prefs);
      setError(undefined);
    } catch (cause) {
      setError(describeRokuError(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const changed = async () => {
    await reload();
    await onChanged?.();
  };
  const add = (
    <Action.Push
      title="Add App or Input Alias"
      icon={Icon.Plus}
      target={<TargetAliasForm devices={devices} onChanged={changed} />}
    />
  );
  return (
    <List isLoading={loading} navigationTitle={navigationTitle} searchBarPlaceholder="Search instruction settings…">
      <List.Section title="Supported Instructions">
        <List.Item
          title="How Local Instructions Work"
          subtitle="Free, on this Mac"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action.Push
                title="Read Supported Instructions"
                icon={Icon.Info}
                target={
                  <Form navigationTitle="Supported Roku Instructions">
                    <Form.Description text={SUPPORTED} />
                  </Form>
                }
              />
              {devices.length > 0 && add}
            </ActionPanel>
          }
        />
        {error && (
          <List.Item
            title="Couldn't Read Settings"
            subtitle={error}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reload} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="TV Names and Protection" subtitle="Aliases identify an exact saved TV">
        {devices.map((device) => (
          <List.Item
            key={device.id}
            title={device.name}
            icon={Icon.Desktop}
            subtitle={
              Object.entries(settings.roomAliases)
                .filter(([, id]) => id === device.id)
                .map(([alias]) => alias)
                .join(", ") || "No extra aliases"
            }
            accessories={settings.protectedDeviceIds.includes(device.id) ? [{ tag: "Must name this TV" }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Names and Protection"
                  icon={Icon.Pencil}
                  target={<RoomSettingsForm device={device} settings={settings} onChanged={changed} />}
                />
                {add}
              </ActionPanel>
            }
          />
        ))}
        {!loading && devices.length === 0 && (
          <List.Item title="Save a TV in Manage Roku TVs First" icon={Icon.Desktop} />
        )}
      </List.Section>
      <List.Section title="App and Input Aliases" subtitle="For example, gaming → PS5 on Living Room">
        {settings.targetAliases.map((alias, index) => (
          <List.Item
            key={`${alias.deviceId}-${alias.alias}-${index}`}
            title={alias.alias}
            subtitle={`App or input on ${devices.find((device) => device.id === alias.deviceId)?.name ?? "a removed TV"}`}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                {add}
                <Action
                  title="Remove Alias"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Remove Alias?",
                      message: `“${alias.alias}” will no longer work in instructions.`,
                      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    try {
                      const current = await getInstructionSettings();
                      current.targetAliases = current.targetAliases.filter(
                        (item) =>
                          !(
                            item.deviceId === alias.deviceId &&
                            item.alias === alias.alias &&
                            item.appId === alias.appId
                          ),
                      );
                      await saveInstructionSettings(current);
                      await changed();
                    } catch (cause) {
                      await showFailureToast(describeRokuError(cause), { title: "Couldn't Remove Alias" });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {devices.length > 0 && (
          <List.Item title="Add App or Input Alias" icon={Icon.Plus} actions={<ActionPanel>{add}</ActionPanel>} />
        )}
      </List.Section>
    </List>
  );
}

function RoomSettingsForm({
  device,
  settings,
  onChanged,
}: {
  device: RokuDevice;
  settings: InstructionSettings;
  onChanged: Changed;
}) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);
  async function submit(values: { aliases: string; protected: boolean }) {
    setLoading(true);
    try {
      const aliases = [...new Set(values.aliases.split(",").map(normalizeInstructionName).filter(Boolean))];
      if (aliases.some((alias) => alias.length > 100 || /[\n\r=]/.test(alias)))
        throw new Error("Use short aliases separated by commas, such as kitchen, downstairs.");
      const current = await getInstructionSettings();
      for (const alias of aliases) {
        if (current.roomAliases[alias] && current.roomAliases[alias] !== device.id)
          throw new Error(`“${alias}” already names another TV. Use a unique alias.`);
      }
      current.roomAliases = Object.fromEntries(
        Object.entries(current.roomAliases).filter(([, id]) => id !== device.id),
      );
      for (const alias of aliases) current.roomAliases[alias] = device.id;
      current.protectedDeviceIds = current.protectedDeviceIds.filter((id) => id !== device.id);
      if (values.protected) current.protectedDeviceIds.push(device.id);
      await saveInstructionSettings(current);
      await onChanged();
      pop();
    } catch (cause) {
      await showFailureToast(describeRokuError(cause), { title: "Couldn't Save TV Instructions" });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Form
      isLoading={loading}
      navigationTitle={`${device.name} Instructions`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save TV Instructions" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`These names always refer to ${device.name}. A protected TV must be named in a plain-English or AI instruction, even when it is your default.`}
      />
      <Form.TextField
        id="aliases"
        title="Room Aliases"
        placeholder="kitchen, downstairs"
        defaultValue={Object.entries(settings.roomAliases)
          .filter(([, id]) => id === device.id)
          .map(([alias]) => alias)
          .join(", ")}
      />
      <Form.Checkbox
        id="protected"
        label="Require this TV to be named explicitly"
        defaultValue={settings.protectedDeviceIds.includes(device.id)}
      />
    </Form>
  );
}

function TargetAliasForm({ devices, onChanged }: { devices: RokuDevice[]; onChanged: Changed }) {
  const { pop } = useNavigation();
  const [deviceId, setDeviceId] = useState("");
  const [apps, setApps] = useState<RokuApp[]>([]);
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    setApps([]);
    setAppId("");
    setError(undefined);
    setLoading(false);
    const device = devices.find((item) => item.id === deviceId);
    if (!device) return;
    setLoading(true);
    const load = async () => {
      try {
        const client = createClient(device);
        const live = await client.getDeviceInfo();
        if (live.id !== device.id)
          throw new Error("A different Roku is using this address. Refresh the saved TV in Manage Roku TVs.");
        const installed = await client.getApps();
        if (!cancelled) setApps(installed);
      } catch (cause) {
        if (!cancelled) setError(describeRokuError(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [deviceId, devices]);
  async function submit(values: { alias: string }) {
    if (saving) return;
    setSaving(true);
    try {
      const alias = normalizeInstructionName(values.alias);
      if (!alias || alias.length > 100 || /[\n\r=]/.test(alias))
        throw new Error("Enter a short alias, such as gaming or cartoons.");
      if (!deviceId || !apps.some((app) => app.id === appId))
        throw new Error("Choose the TV and one of its available apps or inputs.");
      const current = await getInstructionSettings();
      current.targetAliases = current.targetAliases.filter(
        (entry) => !(entry.deviceId === deviceId && entry.alias === alias),
      );
      current.targetAliases.push({ alias, deviceId, appId });
      await saveInstructionSettings(current);
      await onChanged();
      pop();
    } catch (cause) {
      await showFailureToast(describeRokuError(cause), { title: "Couldn't Save Alias" });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Form
      isLoading={loading || saving}
      navigationTitle="Add App or Input Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Alias" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="An alias points to one app or TV input on one saved Roku. For example, choose Living Room, PS5, and the alias gaming; then say ‘open gaming in the living room’." />
      <Form.TextField id="alias" title="Alias" placeholder="gaming" />
      <Form.Dropdown id="device" title="TV" value={deviceId} onChange={setDeviceId}>
        <Form.Dropdown.Item value="" title="Choose a TV" />
        {devices.map((device) => (
          <Form.Dropdown.Item key={device.id} value={device.id} title={device.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="app" title="App or Input" value={appId} onChange={setAppId}>
        <Form.Dropdown.Item value="" title={loading ? "Loading…" : "Choose an app or input"} />
        {apps.map((app) => (
          <Form.Dropdown.Item key={app.id} value={app.id} title={app.name} />
        ))}
      </Form.Dropdown>
      {error && <Form.Description title="Connection" text={error} />}
    </Form>
  );
}
