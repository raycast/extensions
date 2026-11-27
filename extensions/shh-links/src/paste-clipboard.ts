import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { copyInstead, discordSelection, pasteInDiscord } from "./discord";
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
    if (result === "pasted") {
      // Pasted anyway: the message can still be shortened in Discord before sending
      const tooLong = lengthWarning(link);
      if (tooLong) await showHUD(tooLong);
      return;
    }
    const why = result === "closed" ? "Discord is closed" : "Discord was not in front";
    await showHUD(
      (await copyInstead(link)) ? `${why}; the link was copied` : `${why}, and the link could not be copied`,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (!link) {
      await showHUD(`Failed: ${reason}`);
      return;
    }
    // Whatever failed, a link already built is copied so it is not lost
    await showHUD(
      (await copyInstead(link))
        ? `Could not paste into Discord (${reason}); the link was copied`
        : `Could not paste into Discord (${reason}) or copy the link`,
    );
  }
}
