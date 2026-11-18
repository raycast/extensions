import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { nyxe, showApiError } from "./lib/raycast";
import { looksLikeSecret, subjectFromText } from "./lib/text";

/** The selected text (or, with nothing selected, the clipboard) as an email to
 *  your own primary address. Subject: its first line, up to 80 characters. */
export default async function EmailSelectionToMyself() {
  const selected = await getSelectedText().catch(() => "");
  const clipboard = selected ? "" : ((await Clipboard.readText()) ?? "");
  // The clipboard is where Copy Sign-In Code (and a password manager) leave
  // secrets. Mailing one of those by accident is worse than asking.
  if (!selected && looksLikeSecret(clipboard)) {
    await showHUD("Your clipboard looks like a code or password. Select the text instead.");
    return;
  }
  const text = selected || clipboard;
  if (!text.trim()) {
    await showHUD("Nothing selected or copied");
    return;
  }
  try {
    const client = nyxe();
    const me = await client.me();
    if (!me.addresses.primary) {
      await showHUD("Your mailbox isn't set up yet");
      return;
    }
    await client.send({ to: [me.addresses.primary], subject: subjectFromText(text), text });
    await showHUD(`Sent to ${me.addresses.primary}`);
  } catch (err) {
    await showApiError(err, "Couldn't send it");
  }
}
