import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import {
  popHighestFromAnyQueue,
  popItem,
  QueueItem,
  getSortedQueue,
} from "./utils/queue";

interface Arguments {
  queue?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { queue: queueArg } = props.arguments;
  const queueName = queueArg?.trim() || undefined;

  const [item, setItem] = useState<QueueItem | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingCount, setRemainingCount] = useState(0);

  // Use a ref to ensure pop only happens once, even with React Strict Mode
  const hasPopped = useRef(false);

  useEffect(() => {
    // Prevent duplicate pops from Strict Mode or rapid re-renders
    if (hasPopped.current) {
      return;
    }
    hasPopped.current = true;

    async function pop() {
      // If queue name specified, pop from that queue; otherwise pop highest from any queue
      const popped = queueName
        ? await popItem(queueName)
        : await popHighestFromAnyQueue();
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
  }, [queueName]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (isEmpty) {
    const emptyMessage = queueName
      ? `# 📭 Queue "${queueName}" is Empty\nNo items in this queue. Add items using the **Add to Queue** command with \`#${queueName}\`.`
      : `# 📭 Queue is Empty\nNo items to pop. Add items using the **Add to Queue** command.`;
    return (
      <Detail
        markdown={emptyMessage}
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
