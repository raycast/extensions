import { ActionPanel, Detail } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [count, setCount] = useState(0);

  return (
    <Detail
      markdown={count.toString()}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Increment Counter" onAction={() => setCount((c) => c + 1)} />
          <ActionPanel.Item title="Decrement Counter" onAction={() => setCount((c) => c - 1)} />
        </ActionPanel>
      }
    />
  );
}
