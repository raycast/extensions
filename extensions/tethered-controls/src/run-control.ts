import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readStoredData } from "./read-stored-items";
import { isTetheredRunning, sendToTethered } from "./send-to-tethered";

async function requestControl(path: string): Promise<string> {
  if (!(await isTetheredRunning())) throw new Error("Open Tethered before using controls.");
  const url = new URL(`tethered://control${path}`);
  const request = crypto.randomUUID();
  url.searchParams.set("request", request);
  await sendToTethered(url.toString());
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const responses = await readStoredData("raycastControlResponses").catch(() => undefined);
    const result =
      typeof responses === "object" && responses !== null ? (responses as Record<string, unknown>)[request] : undefined;
    if (
      typeof result === "object" &&
      result !== null &&
      "request" in result &&
      result.request === request &&
      "success" in result &&
      typeof result.success === "boolean" &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      if (!result.success) throw new Error(result.message);
      return result.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    "Tethered did not confirm the action. Update the app and check its settings before retrying; the action may have succeeded.",
  );
}

export async function runControl(path: string, title: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await requestControl(path);
    toast.style = Toast.Style.Success;
    toast.title = title;
    toast.message = message;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: `Could not complete ${title}` });
  }
}
