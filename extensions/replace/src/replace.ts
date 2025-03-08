import { Clipboard, showHUD } from "@raycast/api";
/**
 *
 * "Hello World" -> "Hello_world"
 */
export default async function main(props: { arguments: { prefix?: string } }) {
  const input = await Clipboard.readText();
  if (!input) {
    await showHUD("No text in clipboard");
    return;
  }

  const result = input.split(" ").filter(Boolean).join("_");
  const resultWithPrefix = props.arguments.prefix ? `${prefixValue(props.arguments.prefix)}${result}` : result;
  await Clipboard.copy(resultWithPrefix);
  await showHUD(result);
}

function prefixValue(prefix: string): string {
  switch (prefix) {
    case "f":
      return "feature/";
    case "b":
      return "bugfix/";
    case "h":
      return "hotfix/";
    case "r":
      return "release/";

    default:
      return "";
  }
}
