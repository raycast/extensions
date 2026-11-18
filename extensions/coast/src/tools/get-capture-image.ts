import { getCapture, getCaptureImage } from "../coast";
import { captureEvidence } from "../evidence";
import type { CaptureImage } from "../tool-contracts";

type Input = {
  /**
   * Frame ID from another Coast tool result.
   */
  frameId: number;
  /**
   * Crop the screenshot to the focused window recorded for the frame.
   */
  crop?: boolean;
};

/**
 * Export a Coast frame screenshot to a temporary local PNG and return its file path. Use when visual context is required beyond OCR.
 */
export default async function tool(input: Input): Promise<CaptureImage> {
  return {
    ...captureEvidence(await getCapture(input.frameId)),
    image_path: await getCaptureImage(input.frameId, input.crop),
    temporary: true,
  };
}
