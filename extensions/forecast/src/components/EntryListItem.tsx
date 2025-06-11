import { Action, ActionPanel, List } from "@raycast/api";
import { getEntryIcon, getHostname } from "../helpers/utils";
import { EntryListItemProps } from "../types";
import { CommonActions } from "./CommonActions";

export function EntryListItem({
  entry,
  showDetails,
  toggleDone,
  setShowDetails,
  filteredPerson,
  webUrl,
  viewDate,
  changeViewDate,
}: EntryListItemProps) {
  return (
    <List.Item
      key={entry.id}
      icon={getEntryIcon(entry)}
      title={showDetails ? entry.client : entry.title}
      subtitle={showDetails ? undefined : entry.client}
      accessories={showDetails ? [] : [{ icon: entry.hasLinear ? "linear.png" : "icon.png" }]}
      keywords={[entry.client, entry.title, entry.notes]}
      actions={
        <ActionPanel>
          <CommonActions
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            webUrl={webUrl}
            viewDate={viewDate}
            changeViewDate={changeViewDate}
            entry={entry}
            toggleDone={toggleDone}
          />
          {entry.urls
            .filter((url) => !url.linearId && url.url)
            .map((url, i) => (
              <Action.OpenInBrowser key={`browser-${i}`} url={url.url} />
            ))}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {filteredPerson === "all" && (
                <>
                  <List.Item.Detail.Metadata.Label title="Assignee" text={entry.personName} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Client" text={entry.client} />
              <List.Item.Detail.Metadata.Label title="Project" text={entry.title} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Duration" text={entry.duration} />
              {entry.urls?.some((url) => url.linearId) && (
                <>
                  <List.Item.Detail.Metadata.TagList title="Linear Issues">
                    {entry.urls
                      .filter((url) => url.linearId)
                      .map((url) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={url.url}
                          text={url.linearId as string}
                          color="#5760D4"
                          icon="linear.png"
                        />
                      ))}
                  </List.Item.Detail.Metadata.TagList>
                </>
              )}
              {entry.urls?.some((url) => !url.linearId && url.url) && (
                <>
                  {entry.urls
                    .filter((url) => !url.linearId && url.url)
                    .map((url) => (
                      <List.Item.Detail.Metadata.Link
                        key={url.url}
                        text={getHostname(url.url)}
                        title="Link"
                        target={url.url}
                      />
                    ))}
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Notes" text={entry.notes || "-"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
