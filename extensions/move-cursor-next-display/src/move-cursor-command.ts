import { showToast, Toast } from "@raycast/api";
import { moveCursor } from "swift:../swift/movecursor";

export type MoveDirection = "next" | "previous";
export type MovePlacement = "relative" | "center";

export async function runMoveCursor(direction: MoveDirection, placement: MovePlacement = "relative"): Promise<string> {
  return await moveCursor(direction, placement);
}

export function messageFor(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown cursor movement failure.";
}

export async function showMoveCursorToast(direction: MoveDirection, placement: MovePlacement = "relative"): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Moving cursor",
  });

  try {
    const message = await runMoveCursor(direction, placement);
    toast.style = Toast.Style.Success;
    toast.title = message;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not move cursor";
    toast.message = messageFor(error);
  }
}
