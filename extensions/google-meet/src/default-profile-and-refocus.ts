import { showHUD } from "@raycast/api";
import { reportMeetFailure } from "./errors";
import { createMeeting, formatSuccessMessage } from "./services/create-meeting";

export default async function main() {
  try {
    const result = await createMeeting({ refocus: true });
    await showHUD(formatSuccessMessage(result));
  } catch (error) {
    await reportMeetFailure(error, "Create Meet and Refocus");
  }
}
