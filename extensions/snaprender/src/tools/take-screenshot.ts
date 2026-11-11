import { Tool } from "@raycast/api";
import { Device } from "../lib/api";
import { getClient, screenshotFileName, slugFor, writeToDownloads } from "../lib/raycast";

type Input = {
  /** The public web page to capture, for example https://example.com */
  url: string;
  /** Device to emulate. Leave empty for a 1280 x 800 desktop viewport. */
  device?: "iphone_15_pro" | "iphone_14" | "pixel_7" | "ipad_pro" | "macbook_pro";
  /** Capture the whole scrollable page instead of the first screen. */
  fullPage?: boolean;
  /** Ask the page to render its dark color scheme. */
  darkMode?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Capture a screenshot of ${input.url}?`,
    info: [
      { name: "Page", value: input.url },
      { name: "File", value: `New PNG in Downloads: snaprender-${slugFor(input.url)}-<date and time>.png` },
      { name: "Cost", value: "Uses 1 capture from your monthly SnapRender allowance" },
      ...(input.device ? [{ name: "Device", value: input.device }] : []),
      ...(input.fullPage ? [{ name: "Full page", value: "Yes" }] : []),
      ...(input.darkMode ? [{ name: "Dark mode", value: "Yes" }] : []),
    ],
  };
};

/**
 * Captures a PNG screenshot of a public web page, saves it to the Downloads folder and returns the file path.
 */
export default async function tool(input: Input) {
  const shot = await getClient().screenshot({
    url: input.url,
    format: "png",
    device: (input.device as Device | undefined) ?? "desktop",
    fullPage: input.fullPage ?? false,
    darkMode: input.darkMode ?? false,
  });
  const filePath = await writeToDownloads(screenshotFileName(input.url, "png"), shot.data);
  return {
    filePath,
    url: input.url,
    format: "png",
    sizeBytes: shot.data.length,
    capturesLeft: shot.remainingCredits,
    image: `![Screenshot of ${input.url}](${encodeURI(`file://${filePath}`)})`,
  };
}
