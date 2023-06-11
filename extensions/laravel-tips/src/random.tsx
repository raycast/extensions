import { ActionPanel, Detail, Icon } from "@raycast/api";
import { ReactElement } from "react";
import { random } from "./laravel-tip";
import { usePromise } from "@raycast/utils";

export default function Random(): ReactElement {
  const { data: results, isLoading, revalidate } = usePromise(random, []);

  return (
    <Detail
      markdown={results?.data ? `## ${results.data.title}\n\n${results.data.content}` : ""}
      isLoading={isLoading}
      navigationTitle={results?.data?.title || "Random Tip"}
      actions={
        <ActionPanel>
          <ActionPanel.Item
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
