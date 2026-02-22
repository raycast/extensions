import { Action, ActionPanel, Clipboard, Image, List } from "@raycast/api";
import { useCallback } from "react";
import { showToastWithPromise } from "../utils/toast.util";

interface ConvertCaseItemProps {
  title: string;
  input: string;
  convertFunction: (text: string) => string;
  icon?: Image.ImageLike;
}

function ConvertCaseItem({ title, input, convertFunction, icon }: ConvertCaseItemProps) {
  const result = convertFunction(input);

  const onClipboardCopy = useCallback(async () => {
    await showToastWithPromise(
      async () => {
        await Clipboard.copy(result);
      },
      {
        loading: "Copying to clipboard...",
        error: "An error occurred while copying to the clipboard.",
        success: () => ({
          title: `Copying to ${title} has been completed.`,
          message: result,
        }),
      },
    );
  }, [result]);

  return (
    <List.Item
      title={`${title} => `}
      subtitle={result}
      actions={
        <ActionPanel>
          <Action title="Copy Result" onAction={onClipboardCopy} />
        </ActionPanel>
      }
      icon={icon}
    />
  );
}

ConvertCaseItem.displayName = "ConvertCaseItem";

export { ConvertCaseItem };
