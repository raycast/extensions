import { List, ActionPanel, Action, Icon, Clipboard, LocalStorage, showHUD, PopToRootType, Detail } from "@raycast/api";
import { useState, useEffect } from "react";

interface HistoryItem {
  id: string;
  originalText: string;
  shakespearifiedText: string;
  timestamp: number;
}

const copyToClipboard = async (text: string) => {
  await Clipboard.copy(text);
  await showHUD("Copied!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
};

const deleteHistoryItem = async (id: string, setHistoryItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>) => {
  const storedHistory = await LocalStorage.getItem<string>("history");
  if (storedHistory) {
    const parsedHistory = JSON.parse(storedHistory) as HistoryItem[];
    const updatedHistory = parsedHistory.filter((item) => item.id !== id);
    await LocalStorage.setItem("history", JSON.stringify(updatedHistory));
    setHistoryItems(updatedHistory.reverse());
  }
  await showHUD("Entry deleted", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
};

export default function Command() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const storedHistory = await LocalStorage.getItem<string>("history");
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory) as HistoryItem[];
          setHistoryItems(parsedHistory.reverse());
        }
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  return (
    <List isLoading={isLoading}>
      {historyItems.map((item) => (
        <List.Item
          key={`${item.id}-${item.timestamp}`}
          title={item.originalText}
          subtitle={item.shakespearifiedText}
          accessories={[
            {
              text: new Date(item.timestamp).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Shakespearified!"
                icon={Icon.QuoteBlock}
                onAction={() => copyToClipboard(item.shakespearifiedText)}
              />
              <Action
                title="Copy Original!"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(item.originalText)}
              />
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<DetailView item={item} setHistoryItems={setHistoryItems} />}
              />
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteHistoryItem(item.id, setHistoryItems)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DetailView({
  item,
  setHistoryItems,
}: {
  item: HistoryItem;
  setHistoryItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}) {
  const markdown = `
## Shakespearified Wise Text

> ${item.shakespearifiedText.replace(/\n/g, "\n> ")}
 
---

## Original Text

> ${item.originalText.replace(/\n/g, "\n> ")}

---

> *${new Date(item.timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })}*
    `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Shakespearified!"
            icon={Icon.QuoteBlock}
            onAction={() => copyToClipboard(item.shakespearifiedText)}
          />
          <Action title="Copy Original!" icon={Icon.Clipboard} onAction={() => copyToClipboard(item.originalText)} />
          <Action
            title="Delete Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => deleteHistoryItem(item.id, setHistoryItems)}
          />
        </ActionPanel>
      }
    />
  );
}
