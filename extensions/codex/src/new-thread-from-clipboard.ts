import { openNewCodexThreadFromClipboard } from "./utils/codex-launch";

export default async function Command() {
  await openNewCodexThreadFromClipboard();
}
