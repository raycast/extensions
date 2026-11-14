import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function RandomArticle() {
  try {
    await open("https://www.wikihow.com/Special:Randomizer");
    await showHUD("Opening a random wikiHow article");
  } catch (error) {
    await showFailureToast(error, {
      title: "Couldn't open wikiHow",
      message: "Check that a default web browser is set, then try again.",
    });
  }
}
