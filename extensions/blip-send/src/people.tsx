import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { dispatch } from "./blip/client";
import type { BlipState, Device } from "./blip/client";
import { relativeTime } from "./blip/format";
import { contacts, isSignedIn, myDevices, thisDevice } from "./blip/model";
import type { DeviceRecipient, PersonRecipient } from "./blip/model";
import { BlipUnavailable, NotSignedIn } from "./components/BlipUnavailable";
import { FilesForm } from "./components/FilesForm";
import { deviceIcon, personIcon, presenceAccessory } from "./components/icons";
import { useBlipState } from "./hooks/useBlipState";

/** Blip Devices and Contacts: see who you can reach, rename or remove a device, drop a contact. */
export default function Command() {
  const { state, isLoading, unavailable, refresh } = useBlipState();

  if (unavailable && !state) return <BlipUnavailable onReady={refresh} navigationTitle="Blip Devices and Contacts" />;
  if (state && !isSignedIn(state)) return <NotSignedIn />;

  const mine = state ? thisDevice(state) : undefined;
  const devices = state ? myDevices(state) : [];
  const people = state ? contacts(state) : [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Blip Devices and Contacts"
      searchBarPlaceholder="Search devices and contacts"
    >
      <List.Section title="This Mac">
        {mine && state && (
          <List.Item
            title={mine.name || "This Mac"}
            subtitle={state.auth?.email}
            icon={deviceIcon(mine.kind, true)}
            accessories={[{ tag: { value: "You", color: Color.Blue } }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Rename This Mac"
                  icon={Icon.Pencil}
                  target={<RenameDevice device={mine} onDone={refresh} />}
                />
                <Action.CopyToClipboard title="Copy Account Email" content={state.auth?.email ?? ""} />
                <Action.Open
                  title="Open Blip"
                  target="/Applications/Blip.app"
                  icon={Icon.Bolt}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section
        title="Your Other Devices"
        subtitle={devices.length ? `${devices.filter((d) => d.online).length} online` : undefined}
      >
        {devices.map((d) => (
          <List.Item
            key={d.id}
            title={d.title}
            subtitle={d.device.kind === "GenericDevice" ? undefined : d.device.kind}
            icon={deviceIcon(d.device.kind, d.online)}
            accessories={[presenceAccessory(d.online, relativeTime(d.lastOnline))]}
            actions={<DeviceActions recipient={d} refresh={refresh} />}
          />
        ))}
      </List.Section>
      <List.Section title="Contacts" subtitle={people.length ? String(people.length) : undefined}>
        {people.map((p) => (
          <List.Item
            key={p.id}
            title={p.title}
            subtitle={p.email}
            icon={personIcon(p)}
            keywords={[p.email]}
            accessories={personAccessories(p)}
            actions={<PersonActions person={p} state={state as BlipState} refresh={refresh} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function personAccessories(p: PersonRecipient): List.Item.Accessory[] {
  const devices = Object.values(p.user.devices ?? {});
  const out: List.Item.Accessory[] = [];
  if (devices.length)
    out.push({ text: `${devices.length} device${devices.length === 1 ? "" : "s"}`, icon: Icon.Devices });
  if (p.onlineDevices > 0) out.push({ tag: { value: "Online", color: Color.Green } });
  else if (p.lastInteraction) out.push({ text: relativeTime(p.lastInteraction), tooltip: "Last transfer" });
  return out;
}

function DeviceActions({ recipient, refresh }: { recipient: DeviceRecipient; refresh: () => Promise<void> }) {
  async function remove() {
    const ok = await confirmAlert({
      title: `Remove "${recipient.title}" from your account?`,
      message: "The device is signed out of Blip. You can sign it in again later.",
      primaryAction: { title: "Remove Device", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await dispatch("RemoveDevice", { device_id: recipient.id });
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Removed ${recipient.title}` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove the device" });
    }
  }
  return (
    <ActionPanel title={recipient.title}>
      <ActionPanel.Section>
        <Action.Push title="Send Files…" icon={Icon.Upload} target={<FilesForm />} />
        <Action.Push
          title="Rename Device"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          target={<RenameDevice device={recipient.device} onDone={refresh} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Remove Device"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={remove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function PersonActions({
  person,
  refresh,
}: {
  person: PersonRecipient;
  state: BlipState;
  refresh: () => Promise<void>;
}) {
  async function removeContact() {
    const ok = await confirmAlert({
      title: `Remove ${person.title} from your contacts?`,
      message: "They stay on Blip. They come back as a contact after your next transfer together.",
      primaryAction: { title: "Remove Contact", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await dispatch("RemoveContact", { user_id: person.id });
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Removed ${person.title}` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove the contact" });
    }
  }
  async function block() {
    const ok = await confirmAlert({
      title: `Block ${person.title}?`,
      message: "They can no longer send you files. Unblock from inside the Blip app.",
      primaryAction: { title: "Block", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await dispatch("AddBlockedUser", { block_user_id: person.id });
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Blocked ${person.title}` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not block" });
    }
  }
  return (
    <ActionPanel title={person.title}>
      <ActionPanel.Section>
        <Action.Push title="Send Files…" icon={Icon.Upload} target={<FilesForm />} />
        {person.email && (
          <Action.CopyToClipboard
            title="Copy Email"
            content={person.email}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Remove Contact"
          icon={Icon.RemovePerson}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={removeContact}
        />
        <Action title="Block Person" icon={Icon.XMarkCircle} style={Action.Style.Destructive} onAction={block} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RenameDevice({ device, onDone }: { device: Device; onDone: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(device.name ?? "");
  const [error, setError] = useState<string>();

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name.");
      return;
    }
    try {
      await dispatch("UpdateDevice", { device_id: device.device_id, name: trimmed });
      await onDone();
      await showToast({ style: Toast.Style.Success, title: `Renamed to ${trimmed}` });
      pop();
    } catch (e) {
      await showFailureToast(e, { title: "Could not rename the device" });
    }
  }

  return (
    <Form
      navigationTitle="Rename Device"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        error={error}
        onChange={(v) => {
          setName(v);
          if (v.trim()) setError(undefined);
        }}
        info="Shown on all your devices and to people who send you files."
      />
    </Form>
  );
}
