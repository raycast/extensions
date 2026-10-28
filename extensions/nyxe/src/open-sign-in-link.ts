import { open, showHUD } from "@raycast/api";
import { signInLinkUrl } from "./lib/open";
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
    const url = signInLinkUrl(match.link);
    if (!url) {
      await showHUD("The newest sign-in link isn't a secure web link, so it wasn't opened");
      return;
    }
    await open(url.href);
    // Name where it went, not just who sent it.
    await showHUD(`Opened ${url.hostname} from ${displayAddress(match.from)}`);
  } catch (err) {
    await showApiError(err, "Couldn't check for a link");
  }
}
