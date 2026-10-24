import { Clipboard, showHUD } from "@raycast/api";
import { nyxe, showApiError } from "./lib/raycast";
import { displayAddress } from "./lib/text";

const WINDOW_MINUTES = 15;

/**
 * The newest sign-in code from the last 15 minutes, onto the clipboard as
 * CONCEALED (clipboard managers skip it). The HUD names the sender and never
 * the code, so it isn't on screen for a shoulder or a screen recording.
 */
export default async function CopySignInCode() {
  try {
    const match = await nyxe().latestSignIn({ kind: "code", withinMinutes: WINDOW_MINUTES });
    if (!match?.code) {
      await showHUD(`No sign-in code in the last ${WINDOW_MINUTES} minutes`);
      return;
    }
    await Clipboard.copy(match.code, { concealed: true });
    // Say so when our mail server couldn't vouch for the sender: anyone can
    // put "Your verification code" in a subject.
    const unverified = match.senderVerified ? "" : " (unverified sender)";
    await showHUD(`Copied code from ${displayAddress(match.from)}${unverified}`);
  } catch (err) {
    await showApiError(err, "Couldn't check for a code");
  }
}
