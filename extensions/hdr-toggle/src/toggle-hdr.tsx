import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listMonitors, Monitor, toggleHdr } from "./lib/hdr";
import {
  clearSlot,
  getAllSlots,
  setSlot,
  SLOT_COUNT,
  slotForId,
} from "./lib/slots";

export default function Command() {
  const { data: monitors, isLoading, revalidate } = usePromise(listMonitors);
  const { data: slots, revalidate: revalidateSlots } = usePromise(getAllSlots);

  async function onToggle(monitor: Monitor) {
    const turningOn = !monitor.enabled;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${turningOn ? "Enabling" : "Disabling"} HDR`,
      message: monitor.name,
    });
    try {
      const enabled = await toggleHdr(monitor.id);
      toast.style = Toast.Style.Success;
      toast.title = `HDR ${enabled ? "on" : "off"}`;
      toast.message = monitor.name;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to toggle HDR on ${monitor.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function onAssign(monitor: Monitor, slot: number) {
    await setSlot(slot, { id: monitor.id, name: monitor.name });
    revalidateSlots();
    await showToast({
      style: Toast.Style.Success,
      title: `Assigned to Shortcut ${slot}`,
      message: `${monitor.name} — set a hotkey for “Toggle HDR – Shortcut ${slot}” in Raycast`,
    });
  }

  async function onUnassign(slot: number) {
    await clearSlot(slot);
    revalidateSlots();
    await showToast({
      style: Toast.Style.Success,
      title: `Cleared Shortcut ${slot}`,
    });
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No HDR-capable monitors found"
          description="Connect an HDR display, or check that your monitor reports HDR support."
        />
      )}
      {monitors?.map((monitor) => {
        const assignedSlot = slots ? slotForId(slots, monitor.id) : undefined;
        return (
          <List.Item
            key={monitor.id}
            icon={
              monitor.enabled
                ? { source: Icon.CircleFilled, tintColor: Color.Green }
                : Icon.Circle
            }
            title={monitor.name}
            accessories={[
              ...(assignedSlot
                ? [
                    {
                      tag: {
                        value: `Shortcut ${assignedSlot}`,
                        color: Color.Blue,
                      },
                    },
                  ]
                : []),
              {
                tag: monitor.enabled
                  ? { value: "HDR On", color: Color.Green }
                  : { value: "HDR Off", color: Color.SecondaryText },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={monitor.enabled ? "Turn HDR off" : "Turn HDR on"}
                  icon={monitor.enabled ? Icon.LightBulbOff : Icon.LightBulb}
                  onAction={() => onToggle(monitor)}
                />
                <ActionPanel.Submenu
                  title="Assign to Shortcut…"
                  icon={Icon.Star}
                >
                  {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(
                    (n) => {
                      const assigned = slots?.[n];
                      const label = `Shortcut ${n}${assigned ? ` · ${assigned.name}` : ""}`;
                      return (
                        <Action
                          key={n}
                          title={label}
                          onAction={() => onAssign(monitor, n)}
                        />
                      );
                    },
                  )}
                </ActionPanel.Submenu>
                {assignedSlot ? (
                  <Action
                    title={`Remove from Shortcut ${assignedSlot}`}
                    icon={Icon.XMarkCircle}
                    onAction={() => onUnassign(assignedSlot)}
                  />
                ) : null}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => {
                    revalidate();
                    revalidateSlots();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
