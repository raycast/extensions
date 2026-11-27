import { closeMainWindow, showHUD } from "@raycast/api";
import { runControl, showFailureHUD } from "./lib/feedback";
import { hex, MEETING_START_TIMEOUT_MS } from "./lib/hex";
import { StatusReply } from "./lib/types";

const MEETINGS_OFF = "Turn on Labs › Meetings (beta) in Hex first";

export default async function Command() {
  await closeMainWindow();
  let status: StatusReply;
  try {
    status = await hex<StatusReply>(["status"]);
  } catch (error) {
    await showFailureHUD(error);
    return;
  }
  switch (status.meeting.state) {
    case "idle":
      await runControl(["meetings", "record"], {
        changed: "Recording meeting",
        off: MEETINGS_OFF,
        timeoutMs: MEETING_START_TIMEOUT_MS,
      });
      return;
    case "transcribing":
      await showHUD("Hex is still transcribing the last meeting");
      return;
    default:
      await runControl(["meetings", "stop"], {
        changed: "Transcribing meeting",
        off: MEETINGS_OFF,
      });
  }
}
