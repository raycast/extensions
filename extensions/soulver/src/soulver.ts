import { LaunchProps, showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { evaluateExpression } from "./utils/soulver-cli";

interface CommandArguments {
  expression?: string;
}

export default async function main(props: LaunchProps<{ arguments: CommandArguments }>) {
  let expr = props.arguments.expression?.trim();

  if (!expr) {
    const clipboardText = await Clipboard.readText();
    expr = clipboardText?.trim();
  }

  if (!expr) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No expression provided",
      message: "Pass an argument or copy an expression to your clipboard.",
    });
    return;
  }

  try {
    const result = await evaluateExpression(expr);
    await Clipboard.copy(result);
    await showHUD(`= ${result}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to calculate expression";
    await showToast({
      style: Toast.Style.Failure,
      title: "Soulver Error",
      message,
    });
  }
}
