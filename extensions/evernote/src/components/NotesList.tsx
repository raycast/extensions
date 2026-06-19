import { useSQL } from "@raycast/utils";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { escapeSqlLiteral } from "../escapeSqlLiteral";

interface NoteItem {
  id: string;
  updated: string;
  url: string;
  label: string;
  snippet: string;
  notebook_label: string;
  owner: string;
  shardId: string;
}

interface NotesListProps {
  evernoteDB: string;
}

export default function NotesList({ evernoteDB }: NotesListProps) {
  const [searchText, setSearchText] = useState("");

  const notesQuery = useMemo(() => {
    const safe = escapeSqlLiteral(searchText);
    return `
		SELECT 
			n.id, 
			n.updated, 
			n.source_URL AS url,
			n.label AS label, 
			n.snippet, 
			nb.label AS notebook_label,
			n.owner as owner,
			n.shardId as shardId
		FROM Nodes_Note n
		LEFT JOIN Nodes_Notebook nb ON n.parent_Notebook_id = nb.id
		WHERE n.label LIKE '%' || '${safe}' || '%' 
			AND n.deleted IS NULL 
		ORDER BY n.updated DESC 
		LIMIT 10;
	`;
  }, [searchText]);

  const { isLoading, data, permissionView, error } = useSQL<NoteItem>(evernoteDB, notesQuery);

  if (permissionView) {
    return permissionView;
  }

  const items = data ?? [];
  const showErrorEmpty = !isLoading && error;
  const showNoResultsEmpty = !isLoading && !error && items.length === 0;

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search notes...">
      {showErrorEmpty ? (
        <List.EmptyView title="Could not load notes" description={error.message} icon={Icon.ExclamationMark} />
      ) : showNoResultsEmpty ? (
        <List.EmptyView title="No notes found" description="Try a different search." />
      ) : null}
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.label}
          accessories={[
            { icon: Icon.Folder, text: item.notebook_label },
            {
              tooltip: new Date(item.updated).toLocaleDateString("en-US"),
              date: new Date(item.updated),
            },
          ]}
          actions={
            <ActionPanel>
              {item.url && <Action.OpenInBrowser title="Source" url={item.url} />}
              <Action.OpenInBrowser
                title="Open in Evernote"
                url={`evernote:///view/${parseInt(item.owner)}/${item.shardId}/${item.id}/${item.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
