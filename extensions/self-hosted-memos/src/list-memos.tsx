import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Memo, getHost, listMemos, memoUid } from "./api";

const visibilityIcon: Record<string, Icon> = {
  PRIVATE: Icon.Lock,
  PROTECTED: Icon.TwoPeople,
  PUBLIC: Icon.Globe,
};

function memoTitle(memo: Memo): string {
  const firstLine = memo.content.split("\n")[0].trim() || "(empty memo)";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

export default function Command() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listMemos(30);
        if (!cancelled) {
          setMemos(items);
        }
      } catch (error) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load memos",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search memos">
      {memos.map((memo) => (
        <List.Item
          key={memo.name}
          icon={visibilityIcon[memo.visibility] ?? Icon.Document}
          title={memoTitle(memo)}
          accessories={[{ date: new Date(memo.createTime) }, { tag: memo.visibility.toLowerCase() }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Content" content={memo.content} />
              <Action.OpenInBrowser url={`${getHost()}/m/${memoUid(memo)}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
