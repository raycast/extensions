import { Action, Detail, ActionPanel } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function UUIDGenerator() {
  const [uuid, setUuid] = useState(uuidv4());

  return (
    <Detail
      markdown={`# UUID\n\`\`\`\n${uuid}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Uuid" content={uuid} />
          <Action title="Generate New Uuid" onAction={() => setUuid(uuidv4())} />
        </ActionPanel>
      }
    />
  );
}
