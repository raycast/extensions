import { runAction } from "./utils";

export function moveDock(direction: "up" | "down" | "left" | "right"): Promise<void> {
  return runAction(["dock", "move", "--direction", direction], `Dock move ${direction} requested`);
}
