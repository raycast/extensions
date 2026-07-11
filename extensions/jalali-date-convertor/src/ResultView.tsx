import React from "react";
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";

export default function ResultView({ result }: { result: string }) {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={`
# Convert Result
## ${result}
      `}
      actions={
        <ActionPanel>
          <Action title="Go Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
