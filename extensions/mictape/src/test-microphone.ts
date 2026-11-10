import { showToast, Toast } from "@raycast/api";
import { showError } from "./lib/errors";
import { testMicrophone } from "./lib/mictape";

const SECONDS = 5;

const MESSAGES = {
  ok: "Input level is good",
  quiet: "A bit quiet: sit closer or raise the input volume",
  silent: "Too quiet: check microphone access, the input device, and the input volume",
} as const;

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Listening for ${SECONDS} seconds…`,
    message: "Talk at a normal volume",
  });
  try {
    const report = await testMicrophone(SECONDS);
    toast.style = report.verdict === "ok" ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = MESSAGES[report.verdict];
    toast.message = `Mean ${report.meanDB.toFixed(1)} dB / max ${report.maxDB.toFixed(1)} dB`;
  } catch (error) {
    await toast.hide();
    await showError("Could not test the microphone", error);
  }
}
