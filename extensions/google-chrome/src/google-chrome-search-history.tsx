import {
  List,
  ToastStyle,
  showToast,
  popToRoot,
  ActionPanel,
  OpenInBrowserAction,
  CopyToClipboardAction,
} from "@raycast/api";
import { useState, ReactElement } from "react";
import { HistoryEntry, useChromeHistorySearch } from "./browserHistory";
import { faviconUrl } from "./utils";

type GroupedEntries = Map<string, HistoryEntry[]>;

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useChromeHistorySearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString());
  }

  const groupedEntries = entries ? groupEntries(entries) : undefined;
  const groups = groupedEntries ? Array.from(groupedEntries.keys()) : undefined;

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <HistoryItem entry={e} key={e.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const groupEntries = (allEntries: HistoryEntry[]): GroupedEntries =>
  allEntries.reduce((grouped, e) => {
    const title = groupTitle(e.lastVisited);
    const groupEntries = grouped.get(title) ?? [];
    groupEntries.push(e);
    grouped.set(title, groupEntries);
    return grouped;
  }, new Map<string, HistoryEntry[]>());

const groupTitle = (d: Date): string => {
  return new Date(d.toDateString()).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const HistoryItem = (props: { entry: HistoryEntry }): ReactElement => {
  const { url, title } = props.entry;
  const id = props.entry.id.toString();
  const favicon = faviconUrl(64, url);

  return <List.Item id={id} title={title} subtitle={url} icon={favicon} actions={<Actions entry={props.entry} />} />;
};

const onBrowserOpen = () => {
  popToRoot({ clearSearchBar: true });
};

const Actions = (props: { entry: HistoryEntry }): ReactElement => {
  const { title, url } = props.entry;

  return (
    <ActionPanel title={title}>
      <OpenInBrowserAction title="Open in Browser" url={url} onOpen={onBrowserOpen} />
      <CopyToClipboardAction title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
};
