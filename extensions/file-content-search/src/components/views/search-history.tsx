import { Color, Icon, List } from "@raycast/api";
import type { FC } from "react";
import type { SearchHistoryEntry } from "../../types";
import { formatRelativeTime } from "../../utils";
import { HistoryActionPanel } from "../actions";

type SearchHistoryProps = {
  history: SearchHistoryEntry[];
  onSelect: (pattern: string) => void;
  onRemove: (pattern: string) => void;
  onClear: () => void;
};

export const SearchHistoryList: FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClear,
}) => (
  <List.Section title="Recent Searches" subtitle="Press Enter to search again">
    {history.map((entry) => (
      <List.Item
        key={`${entry.pattern}-${entry.timestamp}`}
        icon={Icon.Clock}
        title={entry.pattern}
        accessories={[
          ...(entry.useRegex ? [{ tag: { value: "Regex", color: Color.Purple } as const }] : []),
          { text: formatRelativeTime(entry.timestamp) },
        ]}
        actions={
          <HistoryActionPanel
            onClear={onClear}
            onSelect={onSelect}
            onRemove={onRemove}
            pattern={entry.pattern}
          />
        }
      />
    ))}
  </List.Section>
);
