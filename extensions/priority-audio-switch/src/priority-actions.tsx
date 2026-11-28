// Priority actions in the device list: Switch on Connect, Set as Top Priority, Raise / Lower, Set Priority….
// Changes go through the device store, so the list updates at once.
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import type { AudioDevice } from "./audio-device";
import { actionIcon } from "./device-icon-assets";
import type { DeviceStore, PriorityChange } from "./device-store";
import { launchAutoSwitch } from "./launch-auto-switch";
import type { ConnectMode } from "./priority/connect-mode";
import type { PriorityEntry } from "./priority/decide";
import { ACTION_ICON, ON_CONNECT_ICON, UNRANKED_ICON } from "./priority/icon-pool";
import {
  droppedEntries,
  makeTop,
  MAX_PRIORITY,
  moveBy,
  priorityNumber,
  removeEntry,
  setPosition,
} from "./priority/list";

const NOT_SET = "none";
const SWITCH_ON_CONNECT = "switch";

export type PriorityActionProps = {
  device: AudioDevice;
  store: DeviceStore;
  /** What the device does without a priority. */
  connectMode?: ConnectMode;
};

const entryOf = (device: AudioDevice): PriorityEntry => ({ uid: device.uid, name: device.name });

const droppedMessage = (dropped: PriorityEntry[]) =>
  dropped.length > 0
    ? `${dropped.map((d) => `"${d.name}"`).join(", ")} lost its priority (${MAX_PRIORITY} at most)`
    : undefined;

/** Apply a change; Auto Switch runs once afterwards so the new order takes effect. */
async function apply(store: DeviceStore, change: PriorityChange, title: string, message?: string) {
  await store.changePriorities(change);
  await showToast(Toast.Style.Success, title, message);
  await launchAutoSwitch("priorities");
}

export function SetTopPriorityAction({ device, store }: PriorityActionProps) {
  if (priorityNumber(store.priorities, device.uid) === 1) return null;

  return (
    <Action
      title="Set as Top Priority"
      icon={actionIcon(ACTION_ICON.topPriority, Icon.Star)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => {
        const next = makeTop(store.priorities, entryOf(device));
        return apply(
          store,
          { priorities: next, connect: { uid: device.uid, mode: undefined } },
          `"${store.nameOf(device)}" is now the top ${store.ioType} priority`,
          droppedMessage(droppedEntries(store.priorities, next, device.uid)),
        );
      }}
    />
  );
}

/**
 * Toggle "Switch on Connect". Turning it on removes the device's priority (a device has one or the other); turning
 * it off leaves the device without a priority ("Not Set").
 */
export function SwitchOnConnectAction({ device, store, connectMode }: PriorityActionProps) {
  const isRanked = priorityNumber(store.priorities, device.uid) !== undefined;
  const isOn = !isRanked && connectMode === "switch";

  return (
    <Action
      title={isOn ? "Turn off Switch on Connect" : "Switch on Connect"}
      icon={
        isOn
          ? actionIcon(ACTION_ICON.switchOnConnectOff, Icon.BoltDisabled)
          : actionIcon(ACTION_ICON.switchOnConnect, Icon.Bolt)
      }
      onAction={() =>
        apply(
          store,
          {
            priorities: isRanked ? removeEntry(store.priorities, device.uid) : undefined,
            connect: { uid: device.uid, mode: isOn ? "none" : "switch" },
          },
          isOn
            ? `Switch on Connect is off for "${store.nameOf(device)}"`
            : `"${store.nameOf(device)}" switches on connect`,
          isOn ? undefined : "It becomes the current device when it connects.",
        )
      }
    />
  );
}

export function MovePriorityActions({ device, store }: PriorityActionProps) {
  const priority = priorityNumber(store.priorities, device.uid);
  const rankedCount = store.priorities.length;
  // An unranked device can only be added at the bottom of the list, and only while the list is not full.
  const canMoveUp = priority === undefined ? rankedCount < MAX_PRIORITY : priority > 1;
  const canMoveDown = priority !== undefined && priority < rankedCount;

  const move = (delta: number) =>
    store.changePriorities(
      priority === undefined
        ? { priorities: setPosition(store.priorities, entryOf(device)), connect: { uid: device.uid, mode: undefined } }
        : { priorities: moveBy(store.priorities, device.uid, delta) },
    );

  return (
    <>
      {canMoveUp && (
        <Action
          title="Raise Priority"
          icon={actionIcon(ACTION_ICON.raise, Icon.ArrowUp)}
          shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
          onAction={() => move(-1)}
        />
      )}
      {canMoveDown && (
        <Action
          title="Lower Priority"
          icon={actionIcon(ACTION_ICON.lower, Icon.ArrowDown)}
          shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
          onAction={() => move(1)}
        />
      )}
    </>
  );
}

function SetPriorityForm({ device, store, connectMode }: PriorityActionProps) {
  const { pop } = useNavigation();
  const priority = priorityNumber(store.priorities, device.uid);
  const current = priority !== undefined ? String(priority) : connectMode === "switch" ? SWITCH_ON_CONNECT : NOT_SET;

  return (
    <Form
      navigationTitle={`Priority for ${store.nameOf(device)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Priority"
            onSubmit={async (values: { position: string }) => {
              pop();
              if (values.position === NOT_SET || values.position === SWITCH_ON_CONNECT) {
                // Stored explicitly: "Not Set" must stay off for a device whose default is Switch on Connect.
                const mode = values.position === NOT_SET ? "none" : "switch";
                await apply(
                  store,
                  { priorities: removeEntry(store.priorities, device.uid), connect: { uid: device.uid, mode } },
                  `Updated ${store.ioType} priority for "${store.nameOf(device)}"`,
                );
              } else {
                const next = setPosition(store.priorities, entryOf(device), Number(values.position));
                await apply(
                  store,
                  { priorities: next, connect: { uid: device.uid, mode: undefined } },
                  `Updated ${store.ioType} priority for "${store.nameOf(device)}"`,
                  droppedMessage(droppedEntries(store.priorities, next, device.uid)),
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={[
          `1 is the highest priority (${MAX_PRIORITY} devices at most). The best connected device is used automatically.`,
          "Switch on Connect: no priority, but the device becomes current when it connects.",
          "Not Set: never selected automatically.",
        ].join("\n")}
      />
      <Form.Dropdown id="position" title="Priority" defaultValue={current}>
        <Form.Dropdown.Item
          value={SWITCH_ON_CONNECT}
          title="Switch on Connect"
          icon={actionIcon(ON_CONNECT_ICON.outline, Icon.Bolt)}
        />
        {Array.from({ length: MAX_PRIORITY }, (_, i) => (
          <Form.Dropdown.Item
            key={i + 1}
            value={String(i + 1)}
            title={`${i + 1}`}
            icon={actionIcon(`circle-number-${i + 1}.svg`, Icon.Circle)}
          />
        ))}
        <Form.Dropdown.Item value={NOT_SET} title="Not Set" icon={actionIcon(UNRANKED_ICON, Icon.Circle)} />
      </Form.Dropdown>
    </Form>
  );
}

export function SetPriorityAction(props: PriorityActionProps) {
  return (
    <Action.Push
      title="Set Priority…"
      icon={actionIcon(ACTION_ICON.setPriority, Icon.List)}
      target={<SetPriorityForm {...props} />}
    />
  );
}

/** Raise, lower and set an exact priority. Unranked devices are added at the bottom by "Raise Priority". */
export function PriorityOrderActions(props: PriorityActionProps) {
  return (
    <>
      <MovePriorityActions {...props} />
      <SetPriorityAction {...props} />
    </>
  );
}
