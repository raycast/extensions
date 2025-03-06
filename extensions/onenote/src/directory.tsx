import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState } from "react";
import { OneNoteItem, PAGE, types } from "./types";
import { ONENOTE_MERGED_DB } from "./database";
import { getAncestorsStr, getIcon, getParentTitle, newNote, openNote, parseDatetime } from "./utils";

export function getListItems(query: string, elt: OneNoteItem | undefined = undefined) {
  const [sort, setSort] = useState(0);
  const { data, isLoading, permissionView } = useSQL<OneNoteItem>(ONENOTE_MERGED_DB, query);
  const results = data;

  if (permissionView) {
    return permissionView;
  }

  const onSortChange = (newSort: string) => {
    setSort(Number(newSort));
  };

  const context = getAncestorsStr(elt, " > ", true);
  const placeholderStr = context.length == 0 ? "Search" : `Search in ${context}`;

  return (
    <List
      navigationTitle={context}
      isLoading={isLoading}
      searchBarPlaceholder={placeholderStr}
      searchBarAccessory={<TypeDropdown onSortChange={onSortChange} />}
    >
      {sort == 1 ? (
        types
          .sort((a, b) => b.id - a.id)
          .map((type) => (
            <List.Section title={type.desc} key={type.id}>
              <Items items={results || []} elt={elt} type={type.id} />
            </List.Section>
          ))
      ) : (
        <Items items={results || []} elt={elt} type={0} />
      )}

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

function Items(props: { items: OneNoteItem[]; type: number; elt: OneNoteItem | undefined }): JSX.Element {
  return (
    <>
      {props.items.map((item) => {
        if (item.Title.length > 0 && (props.type == 0 || item.Type == props.type))
          return (
            <List.Item
              key={item.GOID}
              title={item.Title}
              icon={getIcon(item)}
              accessories={[
                {
                  text:
                    (props.elt == undefined && item.ParentGOID != null ? getParentTitle(item) + " ・ " : "") +
                    parseDatetime(item.LastModifiedTime),
                },
              ]}
              subtitle={item.Content?.split("\n")[2]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Browse"
                    icon={Icon.ChevronRight}
                    target={<Directory elt={item} />}
                    shortcut={{ modifiers: [], key: "tab" }}
                  />
                  {/* <Action
                            title="Open in OneNote"
                            icon={Icon.Receipt}
                            onAction={() => openNote(item)}
                            shortcut={{ modifiers: ["cmd"], key: "enter" }}
                             /> */}
                </ActionPanel>
              }
            />
          );
      })}
    </>
  );
}

function TypeDropdown(props: { onSortChange: (newSort: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Results Order"
      storeValue={true}
      onChange={(newValue) => {
        props.onSortChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Results Order">
        <List.Dropdown.Item title="All results flatten, most recent first" value={"0"} key={"0"} />
        <List.Dropdown.Item title="Group by result type (Notebooks, Sections, ...)" value={"1"} key={"1"} />
        {/* {types.map((type) => (
        <List.Dropdown.Item title={type.desc} key={String(type.id)} value={String(type.id)} />
      ))} */}
      </List.Dropdown.Section>
    </List.Dropdown>
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
  // const query = `SELECT * FROM Entities WHERE ParentGOID is NULL ORDER BY RecentTime DESC;`;
  const query = "SELECT * FROM Entities ORDER BY RecentTime DESC;";
  return getListItems(query);
}
