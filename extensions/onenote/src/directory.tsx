import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState } from "react";
import { searchCondition } from "./search";
import { OneNoteItem, PAGE, types } from "./types";
import { getAncestorsStr, getIcon, getParentTitle, newNote, openNote, parseDatetime } from "./utils";

// Rows loaded at a time; more are loaded as the user scrolls, which bounds each query's work and payload.
const PAGE_SIZE = 100;

export function getListItems(
  query: string,
  databasePath: string,
  fullTextIndexed: boolean,
  elt: OneNoteItem | undefined = undefined
) {
  const [sort, setSort] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, permissionView } = useSQL<OneNoteItem>(
    databasePath,
    `${query.replace(
      "ORDER BY",
      () => `${searchCondition(searchText, fullTextIndexed)} ORDER BY ${sort === 1 ? "Type DESC, " : ""}`
    )} LIMIT ${limit};`
  );
  const results = data;

  if (permissionView) {
    return permissionView;
  }

  const onSortChange = (newSort: string) => {
    setSort(Number(newSort));
    setLimit(PAGE_SIZE);
  };

  const context = getAncestorsStr(elt, " > ", true);
  const placeholderStr = context.length == 0 ? "Search" : `Search in ${context}`;

  return (
    <List
      filtering={false}
      onSearchTextChange={(text) => {
        setSearchText(text);
        setLimit(PAGE_SIZE);
      }}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: (results?.length ?? 0) >= limit,
        onLoadMore: () => setLimit((current) => current + PAGE_SIZE),
      }}
      throttle={true}
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
              <Items
                items={results || []}
                elt={elt}
                type={type.id}
                databasePath={databasePath}
                fullTextIndexed={fullTextIndexed}
              />
            </List.Section>
          ))
      ) : (
        <Items items={results || []} elt={elt} type={0} databasePath={databasePath} fullTextIndexed={fullTextIndexed} />
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

const LIST_COLUMNS =
  "Type, GOID, GUID, GOSID, ParentGOID, GrandparentGOIDs, ContentRID, RootRevGenCount, LastModifiedTime, RecentTime, PinTime, Color, Title, EnterpriseIdentity, substr(Content, 1, 1000) AS Content";

function quoteSql(value: string) {
  return value.replaceAll("'", "''");
}

function Items(props: {
  items: OneNoteItem[];
  type: number;
  elt: OneNoteItem | undefined;
  databasePath: string;
  fullTextIndexed: boolean;
}) {
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
                    target={
                      <Directory elt={item} databasePath={props.databasePath} fullTextIndexed={props.fullTextIndexed} />
                    }
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

export function Directory(props: { elt?: OneNoteItem; databasePath: string; fullTextIndexed: boolean }) {
  if (props) {
    if (props.elt) {
      const item = props.elt;
      if (props.elt.Type == PAGE) {
        return <PageDetail item={item} databasePath={props.databasePath} />;
      } else {
        const query = `SELECT ${LIST_COLUMNS} FROM Entities WHERE ParentGOID = '${quoteSql(
          props.elt.GOID
        )}' ORDER BY RecentTime DESC`;
        return getListItems(query, props.databasePath, props.fullTextIndexed, props.elt);
      }
    }
  }
  // const query = `SELECT * FROM Entities WHERE ParentGOID is NULL ORDER BY RecentTime DESC`;
  const query = `SELECT ${LIST_COLUMNS} FROM Entities WHERE 1 = 1 ORDER BY RecentTime DESC`;
  return getListItems(query, props.databasePath, props.fullTextIndexed);
}

function PageDetail({ item, databasePath }: { item: OneNoteItem; databasePath: string }) {
  const { data, isLoading } = useSQL<{ Content: string }>(
    databasePath,
    `SELECT Content FROM Entities WHERE GOID = '${quoteSql(item.GOID)}' LIMIT 1;`
  );
  const content =
    data === undefined
      ? item.Content
      : data[0]?.Content ?? (data.length > 0 ? item.Content : "*Full content could not be loaded.*");

  return (
    <Detail
      navigationTitle={getAncestorsStr(item, " > ", false)}
      isLoading={isLoading}
      markdown={"# " + content}
      actions={
        <ActionPanel>
          <Action title="Open in OneNote" icon={Icon.Receipt} onAction={() => openNote(item)} />
        </ActionPanel>
      }
    />
  );
}
