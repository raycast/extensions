import { Detail, ActionPanel, Action, Icon, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  popHighestFromAnyQueue,
  QueueItem,
  getSortedQueue,
} from "./utils/queue";

export default function Command() {
  const [item, setItem] = useState<QueueItem | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingCount, setRemainingCount] = useState(0);

  useEffect(() => {
    async function pop() {
      const popped = await popHighestFromAnyQueue();
      if (popped) {
        setItem(popped);
        await Clipboard.copy(popped.text);
        const remaining = await getSortedQueue();
        setRemainingCount(remaining.length);
      } else {
        setIsEmpty(true);
      }
      setIsLoading(false);
    }
    pop();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (isEmpty) {
    return (
      <Detail
        markdown={`# 📭 Queue is Empty
No items to pop. Add items using the **Add to Queue** command.
`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add to Queue"
              icon={Icon.Plus}
              target={<Detail markdown="Use 'Add to Queue' command" />}
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
# 🎯 Popped Item

## ${item?.text}

---

| Property | Value |
|----------|-------|
| **Queue** | ${item?.queue} |
| **Priority** | ${item?.priority} |
| **Added** | ${new Date(item?.createdAt || 0).toLocaleString()} |

---

*Copied to clipboard* 📋  
*Saved to history*

${remainingCount > 0 ? `\n**${remainingCount}** item${remainingCount === 1 ? "" : "s"} remaining in queue` : "\n✨ Queue is now empty!"}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Again"
            content={item?.text || ""}
          />
          <Action.Paste title="Paste" content={item?.text || ""} />
        </ActionPanel>
      }
    />
  );
}
