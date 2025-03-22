import { ActionPanel, Detail, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [count, setCount] = useState(0);

  return (
    <Detail
      markdown={count.toString()}
      actions={
        <ActionPanel>
          <Action title="Increment Counter" onAction={() => setCount((c) => c + 1)} />
          <Action title="Decrement Counter" onAction={() => setCount((c) => c - 1)} />
        </ActionPanel>
      }
    />
  );
}
