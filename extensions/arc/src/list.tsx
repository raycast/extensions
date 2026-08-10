import { Action, ActionPanel, Image, List, showToast, Toast, Icon, open, showInFinder } from "@raycast/api";
import { getFavicon, MutatePromise } from "@raycast/utils";
import {
  CopyLinkActionSection,
  CreateQuickLinkActionSection,
  EditTabActionSection,
  OpenLinkActionSections,
  OpenSpaceAction,
} from "./actions";
import { HistoryEntry, Space, Download, Suggestion, Tab } from "./types";
import { getDomain, getLastVisitedAt, getDownloadedAt, getSpaceTitle } from "./utils";

export function HistoryEntryListItem(props: { entry: HistoryEntry; searchText: string }) {
  return (
    <List.Item
      icon={getFavicon(props.entry.url, { mask: Image.Mask.RoundedRectangle })}
      title={props.entry.title}
      subtitle={{
        value: getDomain(props.entry.url),
        tooltip: props.entry.url,
      }}
      accessories={[getLastVisitedAt(props.entry), { tag: props.entry.profileName }]}
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

export function DownloadListItem(props: { download: Download }) {
  return (
    <List.Item
      icon={Icon.Document}
      title={props.download.current_path.substring(props.download.current_path.lastIndexOf("/") + 1)}
      subtitle={{
        value: getDomain(props.download.tab_url),
        tooltip: props.download.tab_url,
      }}
      accessories={[getDownloadedAt(props.download)]}
      actions={
        <ActionPanel>
          <Action
            title="Open File"
            onAction={async () => {
              try {
                await open(props.download.current_path);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could't open the file. The file may have been removed or moved.",
                });
              }
            }}
            icon={Icon.Folder}
          />
          <Action
            title="Show in Finder"
            onAction={async () => {
              try {
                await showInFinder(props.download.current_path);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could't open the file in Finder. The file may have been removed or moved.",
                });
              }
            }}
            icon={Icon.Finder}
          />
          <Action.OpenInBrowser
            title="Open Download Tab in Browser"
            url={props.download.tab_url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
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
      keywords={[props.tab.url]} // Add this line to include URL in searchable content
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
