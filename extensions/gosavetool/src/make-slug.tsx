import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { slug } from "./lib/text";
import { readInput } from "./lib/input";

export default async function Command(props: LaunchProps<{ arguments: Arguments.MakeSlug }>) {
  const { text } = await readInput(props.arguments.text);
  const out = slug(text);
  if (!out) {
    await showHUD("No text to turn into a slug");
    return;
  }
  await Clipboard.copy(out);
  await showHUD(`Copied ${out}`);
}
