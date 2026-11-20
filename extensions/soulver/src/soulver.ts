import { Action, ActionPanel, Clipboard, Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createElement } from "react";
import { evaluateExpression } from "./utils/soulver-cli";

interface Calculation {
  expression: string;
  result: string;
}

export default function main(props: LaunchProps<{ arguments: Arguments.Soulver }>) {
  const {
    data: calculation,
    error,
    isLoading,
  } = usePromise(async (): Promise<Calculation> => {
    let expression: string | undefined = props.arguments.expression?.trim();

    if (!expression) {
      const clipboardText = await Clipboard.readText();
      expression = clipboardText?.trim();
    }

    if (!expression) {
      throw new Error("Pass an argument or copy an expression to your clipboard.");
    }

    const result = await evaluateExpression(expression);
    return { expression, result };
  });

  const errorMessage = error instanceof Error ? error.message : undefined;

  return createElement(Detail, {
    isLoading,
    markdown: errorMessage
      ? `# Unable to calculate\n\n${errorMessage}`
      : calculation
        ? `# ${calculation.result}`
        : "# Calculating...",
    metadata: calculation
      ? createElement(
          Detail.Metadata,
          null,
          createElement(Detail.Metadata.Label, { title: "Expression", text: calculation.expression }),
          createElement(Detail.Metadata.Label, { title: "Result", text: calculation.result }),
        )
      : undefined,
    actions: calculation
      ? createElement(
          ActionPanel,
          null,
          createElement(Action.CopyToClipboard, { title: "Copy Result", content: calculation.result }),
          createElement(Action.CopyToClipboard, { title: "Copy Expression", content: calculation.expression }),
        )
      : undefined,
  });
}
