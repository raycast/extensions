import { openNewCodexThreadFromClipboard } from "./utils/launch";

export default async function Command() {
  await openNewCodexThreadFromClipboard();
}
