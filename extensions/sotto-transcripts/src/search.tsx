import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { EntryItem } from "./components/EntryItem";
import { describeLoadError } from "./util/describe-error";
import { groupEntriesByRecency } from "./util/group-entries";
import { loadEntries } from "./util/load-entries";
import { resolveHistoryPath } from "./util/paths";
import type { Preferences } from "./util/types";

export default function Command() {
  const { historyPath } = getPreferenceValues<Preferences>();
  const resolvedPath = resolveHistoryPath(historyPath);
  const { data, isLoading, error, revalidate } = useCachedPromise(loadEntries, [resolvedPath], {
    keepPreviousData: true,
  });

  const [showingDetail, setShowingDetail] = useState(true);

  const grouped = useMemo(() => groupEntriesByRecency(data ?? []), [data]);

  const toggleDetail = () => setShowingDetail((v) => !v);

  if (error) {
    const { title, description } = describeLoadError(error);
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search transcripts…" isShowingDetail={showingDetail} throttle>
      {grouped.length === 0 && !isLoading ? <List.EmptyView icon={Icon.Microphone} title="No transcripts yet" /> : null}
      {grouped.map((group) => (
        <List.Section key={group.label} title={group.label}>
          {group.entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              onReload={revalidate}
              onToggleDetail={toggleDetail}
              showingDetail={showingDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
