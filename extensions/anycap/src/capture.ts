import { LaunchProps, showHUD } from "@raycast/api";
import { asURL, save } from "./anycap";

export default async function main(props: LaunchProps<{ arguments: Arguments.Capture }>) {
  const content = props.arguments.content.trim();
  if (!content) {
    await showHUD("Nothing to capture");
    return;
  }
  try {
    const url = asURL(content);
    await showHUD(await save(url ? { url } : { text: content }));
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
