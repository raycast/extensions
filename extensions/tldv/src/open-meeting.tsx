import { LaunchProps, open, showToast, Toast, popToRoot } from "@raycast/api";
import { OpenMeetingArguments } from "./types";

// Deep link command to open a specific meeting
export default async function OpenMeetingCommand(
  props: LaunchProps<{ arguments: OpenMeetingArguments }>,
) {
  const { meetingId, meetingUrl } = props.arguments;

  if (meetingUrl) {
    // Direct URL provided
    if (meetingUrl.includes("tldv.io")) {
      await open(meetingUrl);
      await popToRoot();
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
      message: "Please provide a valid tl;dv meeting URL",
    });
    return;
  }

  if (meetingId) {
    // Meeting ID provided, construct URL
    const url = `https://tldv.io/app/meetings/${meetingId}`;
    await open(url);
    await popToRoot();
    return;
  }

  // No arguments provided
  await showToast({
    style: Toast.Style.Failure,
    title: "Missing argument",
    message: "Please provide a meeting ID or URL",
  });
}
