import { LaunchProps, showHUD } from "@raycast/api";
import { resolvePerson } from "./lib/contacts";
import { callLink } from "./lib/chat";
import { report } from "./lib/meeting";
import { TeamsError, openInTeams } from "./lib/teams";

export default async function Command(props: LaunchProps<{ arguments: Arguments.StartCall }>) {
  try {
    const target = await resolvePerson(props.arguments.person);
    if (target.kind !== "email") {
      throw new TeamsError(
        `"${target.query}" is neither an email address nor a saved contact. Calls need the address, so add the person in Teams Contacts.`,
      );
    }
    const video = props.arguments.kind === "video";
    await openInTeams(callLink(target.email, video));
    await showHUD(`${video ? "Video call" : "Call"} with ${target.label} – confirm in Teams`);
  } catch (error) {
    await report(error, "Could not start the call");
  }
}
