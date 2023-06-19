import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { ReactElement } from "react";
import { random } from "./laravel-tip";
import { usePromise } from "@raycast/utils";

export default function Random(): ReactElement {
  const { data: results, isLoading, revalidate } = usePromise(random, []);

  if (results?.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: results.error.message,
    });
  }

  return (
    <Detail
      markdown={results?.data ? `## ${results.data.title}\n\n${results.data.content}` : ""}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Next Tip"
            icon={Icon.Gift}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    />
  );
}
