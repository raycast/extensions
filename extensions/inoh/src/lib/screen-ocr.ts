import { recognizeTextInSelectedRegion } from "swift:../../swift";
import { narrowScreenOcrOutcome } from "./screen-ocr-outcome";
import type { ScreenOcrOutcome } from "../types";

const RECOGNIZER_UNAVAILABLE_MESSAGE = "Couldn't start the text recognizer. It needs macOS 15 or later.";

/**
 * Puts the region-select crosshair on screen and recognizes the English text
 * in whatever the user drags out.
 *
 * Runs entirely on-device through Apple Vision; no image leaves the machine.
 * This is the only module that touches the Swift bridge, which keeps the
 * `swift:` import out of anything a test needs to load.
 *
 * @returns The recognized text, or why there is none
 */
export async function recognizeTextInScreenRegion(): Promise<ScreenOcrOutcome> {
  try {
    return narrowScreenOcrOutcome(await recognizeTextInSelectedRegion());
  } catch (error) {
    // Reason: the bridge rejects, rather than resolving with an outcome, when
    // the Swift binary cannot launch at all. That is what macOS 14 and earlier
    // do with a target built for 15. Turn it into an ordinary failure so the
    // command reports it in a toast instead of Raycast showing an error screen.
    // The underlying message is a linker complaint, so log it and tell the user
    // something they can act on.
    console.error(error);
    return { status: "failed", errorMessage: RECOGNIZER_UNAVAILABLE_MESSAGE };
  }
}
