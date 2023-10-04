import { Clipboard, closeMainWindow } from "@raycast/api";
import { getLatestCommit } from ".";

export default async function CopyLatestCommit() {
  const latest = await getLatestCommit();
  console.log("Copy latest commit from local storage", latest);
  if (!latest) return;
  await Clipboard.copy(latest);
  await closeMainWindow({ clearRootSearch: true });
}
