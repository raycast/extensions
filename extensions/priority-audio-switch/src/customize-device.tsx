import { Action, ActionPanel, Color, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { AudioDevice } from "./audio-device";
import { actionIcon, deviceIconSource, getIconPool } from "./device-icon-assets";
import type { DeviceStore } from "./device-store";
import { ACTION_ICON, defaultIconId, findPoolIcon } from "./priority/icon-pool";
import type { DeviceMeta } from "./priority/meta";

const DEFAULT_ICON = "";

type Props = { device: AudioDevice; store: DeviceStore };

function CustomizeDeviceForm({ device, store }: Props) {
  const ioType = store.ioType;
  const meta: DeviceMeta | undefined = store.meta[device.uid];
  const { pop } = useNavigation();
  const pool = getIconPool();
  // A stored icon whose file has been removed falls back to the automatic icon.
  const selectedIcon = pool.some((p) => p.id === meta?.icon) ? (meta?.icon ?? DEFAULT_ICON) : DEFAULT_ICON;
  const automatic = findPoolIcon(pool, defaultIconId(device, ioType));

  return (
    <Form
      navigationTitle={`Customize ${store.nameOf(device)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { name: string; icon: string }) => {
              // Close only after the save: a failed save keeps the form open with what was entered.
              try {
                await store.updateMeta(device.uid, { name: values.name, icon: values.icon || undefined }, device.name);
              } catch (error) {
                await showFailureToast(error, { title: `Could not update "${store.nameOf(device)}"` });
                return;
              }
              pop();
              await showToast(Toast.Style.Success, `Updated "${values.name.trim() || device.name}"`);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder={device.name}
        defaultValue={meta?.name ?? ""}
        info="Leave empty to use the system name. Matching and priorities keep using the system name."
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={selectedIcon}>
        <Form.Dropdown.Item
          value={DEFAULT_ICON}
          title={automatic ? `Default (${automatic.title})` : "Default"}
          icon={actionIcon(ACTION_ICON.defaultIcon, Icon.Wand)}
        />
        {pool.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id}
            title={p.title}
            icon={{ source: deviceIconSource(p.outline), tintColor: Color.PrimaryText }}
          />
        ))}
      </Form.Dropdown>
      {pool.length === 0 && <Form.Description text="No icons found in assets/icons/devices." />}
    </Form>
  );
}

export function CustomizeDeviceAction(props: Props) {
  return (
    <Action.Push
      title="Customize Device"
      icon={actionIcon(ACTION_ICON.customize, Icon.Pencil)}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<CustomizeDeviceForm {...props} />}
    />
  );
}
