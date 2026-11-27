import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { discordSelection, pasteInDiscord } from "./discord";
import { formatContent, fromSelection, lengthWarning } from "./format";

// No form: the clipboard links go into Discord as [site](<url>). Words selected in
// Discord become the text of a single link instead, and the link replaces them.
export default async function Command() {
  let link: string | undefined;
  try {
    const selection = fromSelection(await discordSelection());
    const content = selection.urls || (await Clipboard.readText()) || "";
    const { untrack } = getPreferenceValues<Preferences>();
    link = formatContent(selection.text, content, { named: true, untrack });
    if (!link) {
      await showHUD("No link on the clipboard");
      return;
    }

    const result = await pasteInDiscord(link);
    // Pasted anyway: the message can still be shortened in Discord before sending
    const tooLong = lengthWarning(link);
    if (result === "pasted" && tooLong) await showHUD(tooLong);
    if (result !== "pasted") {
      await Clipboard.copy(link);
      await showHUD(
        result === "closed"
          ? "Discord is closed; the link was copied"
          : "Discord was not in front; the link was copied",
      );
    }
  } catch (error) {
    // Whatever failed, a link already built is copied so it is not lost
    const reason = error instanceof Error ? error.message : String(error);
    if (link) await Clipboard.copy(link).catch(() => undefined);
    await showHUD(link ? `Could not paste into Discord (${reason}); the link was copied` : `Failed: ${reason}`);
  }
}
