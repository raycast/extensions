import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { setWorkItemDone } from "./ado";
import { statusColor, statusLabel } from "./status";
import { LocalStatus, WorkItem } from "./types";

/** Icon for a work-item type (Bug / User Story / everything else). */
export function typeIcon(type: string): Icon {
  switch (type) {
    case "Bug":
      return Icon.Bug;
    case "User Story":
      return Icon.Bookmark;
    default:
      return Icon.Circle;
  }
}

/** Row accessories: priority, muted view-only ADO state, color-coded local status. */
export function workItemAccessories(
  item: WorkItem,
  status: LocalStatus,
): List.Item.Accessory[] {
  return [
    ...(item.priority ? [{ tag: `P${item.priority}` }] : []),
    { tag: { value: item.state, color: Color.SecondaryText } },
    { tag: { value: statusLabel(status), color: statusColor(status) } },
  ];
}

/**
 * Push a work item to the configured done state in ADO, with progress/result
 * toasts. Returns whether it succeeded so the caller can revalidate.
 */
export async function markWorkItemDone(
  id: number,
  doneState: string,
): Promise<boolean> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Moving #${id} to ${doneState}…`,
    });
    await setWorkItemDone(id);
    await showToast({
      style: Toast.Style.Success,
      title: `#${id} → ${doneState}`,
    });
    return true;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Update failed",
      message: String(e),
    });
    return false;
  }
}
