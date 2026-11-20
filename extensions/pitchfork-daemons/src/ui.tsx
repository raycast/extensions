import { Color, Icon, Image, Toast, showToast } from "@raycast/api";
import { Action, Daemon } from "./model";
import { control } from "./pitchfork";

export const PENDING: Record<Action, string> = { start: "starting…", stop: "stopping…", restart: "restarting…" };
export const VERB: Record<Action, string> = { start: "Start", stop: "Stop", restart: "Restart" };
export const ACTION_ICON: Record<Action, Icon> = { start: Icon.Play, stop: Icon.Stop, restart: Icon.RotateClockwise };

export function statusColor(status: string): Color {
  if (status === "running") return Color.Green;
  if (status === "failed" || status === "errored") return Color.Red;
  return Color.SecondaryText;
}

export function statusIcon(daemon: Daemon, pending?: Action): Image.ImageLike {
  if (pending) return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  return {
    source: daemon.status === "running" ? Icon.CircleFilled : Icon.Circle,
    tintColor: statusColor(daemon.status),
  };
}

export async function runAction(action: Action, ids: string[], label: string): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${PENDING[action][0].toUpperCase()}${PENDING[action].slice(1)}`,
    message: label,
  });
  try {
    await control(action, ids);
    toast.style = Toast.Style.Success;
    toast.title = `${VERB[action]} finished`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not ${action} ${label}`;
    toast.message = String(error instanceof Error ? error.message : error);
    return false;
  }
}
