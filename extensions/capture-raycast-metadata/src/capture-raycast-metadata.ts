import {
  captureRaycastMetadata,
  errorMessage,
  findRaycastMainWindow,
  showCaptureResult,
  showFailure,
} from "./utils/common-utils";

// No progress toast before the capture: it would land in the screenshot. The capture itself
// takes well under a second, and the result toast appears as soon as the file is written.
export default async function Command() {
  let frame;
  try {
    frame = await findRaycastMainWindow();
  } catch (error) {
    await showFailure("Couldn't Read Raycast's Windows", errorMessage(error));
    return;
  }

  if (!frame) {
    await showFailure(
      "Raycast Window Not Found",
      "Open Raycast at its default size, then run this command from its hotkey.",
    );
    return;
  }

  try {
    await showCaptureResult(await captureRaycastMetadata(frame));
  } catch (error) {
    await showFailure("Capture Failed", errorMessage(error));
  }
}
