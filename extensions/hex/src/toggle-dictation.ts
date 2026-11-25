import { closeMainWindow } from "@raycast/api";
import { runControl, showFailureHUD } from "./lib/feedback";
import { errorCode, hex } from "./lib/hex";
import { StatusReply } from "./lib/types";

export default async function Command() {
  await closeMainWindow();
  let status: StatusReply | undefined;
  try {
    status = await hex<StatusReply>(["status"]);
  } catch (error) {
    if (errorCode(error) !== "not-running") {
      await showFailureHUD(error);
      return;
    }
  }
  if (status?.capture.recording === "dictation") {
    await runControl(["dictation", "stop"], { changed: "Transcribing" });
  } else {
    await runControl(["dictation", "start"], {
      changed: "Recording",
      launch: true,
    });
  }
}
