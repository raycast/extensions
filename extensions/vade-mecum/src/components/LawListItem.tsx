import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Law } from "../types";
import ArticleListDetail from "./ArticleListDetail";

interface LawListItemProps {
  law: Law;
  isPinned: boolean;
  pinnedLaws: string[];
  onTogglePin: (pinnedLaws: string[] | ((prevPinnedLaws: string[]) => string[])) => void;
  onMoveUpInPinned: (lawNumber: string) => void;
  onMoveDownInPinned: (lawNumber: string) => void;
}

export default function LawListItem({
  law,
  isPinned,
  pinnedLaws,
  onTogglePin,
  onMoveUpInPinned,
  onMoveDownInPinned,
}: LawListItemProps) {
  const togglePin = () => {
    onTogglePin((prevPinnedLaws) => {
      if (isPinned) {
        return prevPinnedLaws.filter((lawNumber) => lawNumber !== law.fullNumber);
      } else {
        return [...prevPinnedLaws, law.fullNumber];
      }
    });
  };

  return (
    <List.Item
      title={law.name}
      accessories={[{ text: law.shortNumber }]}
      icon={Icon.Book}
      actions={
        <ActionPanel title={law.name}>
          <Action.Push title="View Articles" icon={Icon.Eye} target={<ArticleListDetail law={law} />} />
          <Action.OpenInBrowser url={law.url} />
          <ActionPanel.Section>
            <Action
              title={isPinned ? "Unpin Law" : "Pin Law"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
              onAction={togglePin}
            />
            {isPinned && (
              <>
                {pinnedLaws.indexOf(law.fullNumber) > 0 && (
                  <Action
                    title="Move Up in Pinned"
                    icon={Icon.ChevronUp}
                    shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
                    onAction={() => onMoveUpInPinned(law.fullNumber)}
                  />
                )}
                {pinnedLaws.indexOf(law.fullNumber) < pinnedLaws.length - 1 && (
                  <Action
                    title="Move Down in Pinned"
                    icon={Icon.ChevronDown}
                    shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
                    onAction={() => onMoveDownInPinned(law.fullNumber)}
                  />
                )}
              </>
            )}
          </ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Law Number"
            content={law.fullNumber}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Law Name"
            content={law.name}
            shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
