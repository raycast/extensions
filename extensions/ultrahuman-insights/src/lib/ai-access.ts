import { AI, environment } from "@raycast/api";

export function assertAiAccess(): void {
  if (!environment.canAccess(AI)) {
    throw new Error("Raycast AI is not available on this device or plan.");
  }
}
