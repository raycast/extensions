import { open, showHUD } from "@raycast/api";

export default async function RandomArticle() {
  await open("https://www.wikihow.com/Special:Randomizer");
  await showHUD("Opening a random wikiHow article");
}
