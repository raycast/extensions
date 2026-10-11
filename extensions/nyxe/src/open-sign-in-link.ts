import { open, showHUD } from "@raycast/api";
import { nyxe, showApiError } from "./lib/raycast";
import { displayAddress } from "./lib/text";

const WINDOW_MINUTES = 15;

/** The newest magic/verification link from the last 15 minutes, opened in
 *  the default browser. */
export default async function OpenSignInLink() {
  try {
    const match = await nyxe().latestSignIn({ kind: "link", withinMinutes: WINDOW_MINUTES });
    if (!match?.link) {
      await showHUD(`No sign-in link in the last ${WINDOW_MINUTES} minutes`);
      return;
    }
    await open(match.link);
    // Name where it went, not just who sent it.
    await showHUD(`Opened ${new URL(match.link).hostname} from ${displayAddress(match.from)}`);
  } catch (err) {
    await showApiError(err, "Couldn't check for a link");
  }
}
