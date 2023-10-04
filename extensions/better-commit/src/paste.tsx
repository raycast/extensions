import { Clipboard } from "@raycast/api";
import { getLatestCommit } from ".";

export default async function PastLatestCommand() {
  const latest = await getLatestCommit();
  // console.log("Pasted latest commit from local storage", latest);
  if (!latest) return;
  await Clipboard.paste(latest);
}
