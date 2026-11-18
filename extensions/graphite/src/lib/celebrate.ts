import { launchCommand, LaunchType } from "@raycast/api";

/** Shows Raycast's built-in confetti after a merge. Best effort: a merge never fails because of it. */
export async function celebrate(): Promise<void> {
  try {
    await launchCommand({
      name: "confetti",
      extensionName: "raycast",
      ownerOrAuthorName: "raycast",
      type: LaunchType.UserInitiated,
    });
  } catch {
    // Confetti is decoration; ignore failures.
  }
}
