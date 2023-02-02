import { ActionPanel, Action, List, Detail, Icon, Toast, showToast } from "@raycast/api";
import { isPermissionError, PermissionErrorScreen } from "./errors";
import { OneNoteItem, PAGE } from "./types";
import { useSqlOneNote } from "./useSql";
import { getAncestorsStr, getIcon, getParentTitle, newNote, openNote, parseDatetime } from "./utils";

export function getListItems(query: string, elt: OneNoteItem | undefined = undefined) {
  const { results, error, isLoading } = useSqlOneNote<OneNoteItem>(query);

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionErrorScreen />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search OneNote notes",
        message: error.message,
      });
    }
  }

  const context = getAncestorsStr(elt, " > ", true);
  const placeholderStr = context.length == 0 ? "Search" : `Search in ${context}`;

  return (
    <List navigationTitle={context} isLoading={isLoading} searchBarPlaceholder={placeholderStr}>
      {(results || []).map((item) => {
        if (item.Title.length > 0)
          return (
            <List.Item
              key={item.GOID}
              title={item.Title}
              icon={getIcon(item)}
              accessories={[
                {
                  text:
                    (elt == undefined && item.ParentGOID != null ? getParentTitle(item) + " ・ " : "") +
                    parseDatetime(item.LastModifiedTime),
                },
              ]}
              subtitle={item.Content?.split("\n")[2]}
              actions={
                <ActionPanel>
                  <Action title="Open in OneNote" icon={Icon.Receipt} onAction={() => openNote(item)} />
                  <Action.Push
                    title="Browse"
                    icon={Icon.ChevronRight}
                    target={<Directory elt={item} />}
                    shortcut={{ modifiers: [], key: "tab" }}
                  />
                </ActionPanel>
              }
            />
          );
      })}
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action title="Create New Note" icon={Icon.NewDocument} onAction={() => newNote(elt)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function Directory(props: { elt?: OneNoteItem }) {
  if (props) {
    if (props.elt) {
      const item = props.elt;
      if (props.elt.Type == PAGE) {
        return (
          <Detail
            navigationTitle={getAncestorsStr(props.elt, " > ", false)}
            markdown={"# " + props.elt.Content}
            actions={
              <ActionPanel>
                <Action title="Open in OneNote" icon={Icon.Receipt} onAction={() => openNote(item)} />
              </ActionPanel>
            }
          />
        );
      } else {
        const query = `SELECT * FROM Entities WHERE ParentGOID = "${props.elt.GOID}" ORDER BY RecentTime DESC;`;
        return getListItems(query, props.elt);
      }
    }
  }
  const query = `SELECT * FROM Entities WHERE ParentGOID is NULL ORDER BY RecentTime DESC;`;
  return getListItems(query);
}
