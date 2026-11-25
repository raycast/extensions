import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureHUD } from "./lib/feedback";
import { errorCode, hex } from "./lib/hex";
import { AnnotationStatusReply } from "./lib/types";

export default async function Command() {
  await closeMainWindow();
  try {
    const status = await hex<AnnotationStatusReply>(["annotate", "status"]);
    const recording = status.state === "recording";
    const reply = await hex<AnnotationStatusReply>(["annotate", recording ? "stop" : "start"]);
    if (!reply.changed) {
      await showHUD(recording ? "Annotation already stopped" : "Already annotating");
      return;
    }
    await showHUD(recording ? "Saving annotation to captures" : "Annotating");
  } catch (error) {
    if (errorCode(error) === "unsupported") {
      await showHUD("Annotation is disabled in Hex");
      return;
    }
    await showFailureHUD(error, "Turn on Settings › Annotate in Hex first");
  }
}
