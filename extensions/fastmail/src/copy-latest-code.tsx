import { Clipboard, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { FRESH_MINUTES, freshLogins } from "./util/codes";
import { getToken, InvalidTokenError } from "./util/jmap";

export default async function CopyLatestCode() {
  if (!(await getToken())) {
    await launchCommand({ name: "search", type: LaunchType.UserInitiated });
    return;
  }

  try {
    const login = (await freshLogins()).find((l) => l.code);
    if (!login?.code) {
      await showHUD(`No login code in the last ${FRESH_MINUTES} minutes`);
      return;
    }
    await Clipboard.copy(login.code, { concealed: true });
    await showHUD(`Copied ${login.code} from ${login.sender}`);
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      await showHUD("Your Fastmail token no longer works. Open Search Email to fix it.");
    } else {
      await showHUD(`Couldn't check Fastmail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
