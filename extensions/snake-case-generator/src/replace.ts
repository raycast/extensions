import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
/**
 *
 * "Hello World" -> "Hello_world"
 */
export default async function main(props: { arguments: { prefix?: string } }) {
  let input: string | undefined;
  try {
    input = await Clipboard.readText();
    if (!input) {
      await showHUD("No text in clipboard");
      return;
    }
    const result = input.split(" ").filter(Boolean).join("_");
    const resultWithPrefix = props.arguments.prefix ? `${prefixValue(props.arguments.prefix)}${result}` : result;
    await Clipboard.copy(resultWithPrefix);
    await showHUD(resultWithPrefix);
  } catch (error) {
    await showFailureToast("Failed to read clipboard", {
      title: "Failed to read clipboard",
      message: "Please try again",
      primaryAction: {
        title: "Try again",
        onAction: () => {
          main(props);
        },
      },
    });
    return;
  }
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
