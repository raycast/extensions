import { Action, ActionPanel, Image, List } from "@raycast/api";
import { getFavicon, MutatePromise } from "@raycast/utils";
import {
  CopyLinkActionSection,
  CreateQuickLinkActionSection,
  EditTabActionSection,
  OpenLinkActionSections,
  OpenSpaceAction,
} from "./actions";
import { HistoryEntry, Space, Suggestion, Tab } from "./types";
import { getDomain, getLastVisitedAt, getSpaceTitle } from "./utils";

export function HistoryEntryListItem(props: { entry: HistoryEntry; searchText: string }) {
  return (
    <List.Item
      icon={getFavicon(props.entry.url, { mask: Image.Mask.RoundedRectangle })}
      title={props.entry.title}
      subtitle={{
        value: getDomain(props.entry.url),
        tooltip: props.entry.url,
      }}
      accessories={[getLastVisitedAt(props.entry)]}
      actions={
        <ActionPanel>
          <OpenLinkActionSections tabOrUrl={props.entry.url} searchText={props.searchText} />
          <CopyLinkActionSection url={props.entry.url} title={props.entry.title} />
        </ActionPanel>
      }
    />
  );
}

export function SpaceListItem(props: { space: Space }) {
  return (
    <List.Item
      title={getSpaceTitle(props.space)}
      actions={
        <ActionPanel>
          <OpenSpaceAction space={props.space} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Space Title"
              content={getSpaceTitle(props.space)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function SuggestionListItem(props: { suggestion: Suggestion; searchText: string }) {
  return (
    <List.Item
      icon={getFavicon(props.suggestion.url, { mask: Image.Mask.RoundedRectangle })}
      title={props.suggestion.query}
      actions={
        <ActionPanel>
          <OpenLinkActionSections tabOrUrl={props.suggestion.url} searchText={props.searchText} />
          <CopyLinkActionSection url={props.suggestion.url} />
        </ActionPanel>
      }
    />
  );
}

export function TabListItem(props: { tab: Tab; searchText: string; mutate: MutatePromise<Tab[] | undefined> }) {
  return (
    <List.Item
      icon={getFavicon(props.tab.url, { mask: Image.Mask.RoundedRectangle })}
      title={props.tab.title}
      subtitle={{
        value: getDomain(props.tab.url),
        tooltip: props.tab.url,
      }}
      actions={
        <ActionPanel>
          <OpenLinkActionSections tabOrUrl={props.tab} searchText={props.searchText} />
          <CopyLinkActionSection url={props.tab.url} title={props.tab.title} />
          <CreateQuickLinkActionSection url={props.tab.url} title={props.tab.title} />
          <EditTabActionSection tab={props.tab} mutate={props.mutate} />
        </ActionPanel>
      }
    />
  );
}
