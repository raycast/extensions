import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { findMeetingLink } from "./lib/links";
import { report } from "./lib/meeting";
import { TeamsError, openInTeams } from "./lib/teams";

export default async function Command(props: LaunchProps<{ arguments: Arguments.JoinMeeting }>) {
  try {
    const given = props.arguments.link?.trim();
    const link = given ? findMeetingLink(given) : findMeetingLink(await Clipboard.readText());
    if (!link) {
      throw new TeamsError(
        given
          ? "That is not a Teams meeting link."
          : "No Teams meeting link on the clipboard. Copy the link from the invitation, or paste it as the argument.",
      );
    }
    await openInTeams(link);
    await showHUD("Joining the meeting in Teams");
  } catch (error) {
    await report(error, "Could not join the meeting");
  }
}
