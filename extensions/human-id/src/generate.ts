import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { DEFAULT_WORDS, MAX_WORDS, MIN_WORDS, humanId } from "./human-id";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Generate }>) {
  const parsed = Number.parseInt(props.arguments.words ?? "", 10);
  const wordCount = Number.isNaN(parsed) ? DEFAULT_WORDS : Math.min(MAX_WORDS, Math.max(MIN_WORDS, parsed));

  const id = humanId(wordCount);
  await Clipboard.copy(id);
  await showHUD(`Copied ${id}`);
}
