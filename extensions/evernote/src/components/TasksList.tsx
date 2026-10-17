import { useSQL } from "@raycast/utils";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { escapeSqlLiteral } from "../escapeSqlLiteral";

interface TaskItem {
  id: string;
  note_id: string;
  dueDate: string;
  status: string;
  updated: string;
  url: string;
  label: string;
  snippet: string;
  note_label: string;
  owner: string;
  shardId: string;
}

interface TasksListProps {
  evernoteDB: string;
}

export default function TasksList({ evernoteDB }: TasksListProps) {
  const [searchText, setSearchText] = useState("");

  const tasksQuery = useMemo(() => {
    const safe = escapeSqlLiteral(searchText);
    return `
    SELECT 
      n.id,
      nb.id AS note_id, 
      n.dueDate, 
      n.status,
      n.label AS label, 
      nb.label AS note_label,
      nb.owner as owner,
      nb.shardId as shardId		
    FROM Nodes_Task n
    LEFT JOIN Nodes_Note nb ON n.parent_Note_id = nb.id
    WHERE n.label LIKE '%' || '${safe}' || '%' 
      AND n.status IS NOT 'completed' 
    ORDER BY n.updated DESC 
    LIMIT 10;
  `;
  }, [searchText]);

  const { isLoading, data, permissionView, error } = useSQL<TaskItem>(evernoteDB, tasksQuery);

  if (permissionView) {
    return permissionView;
  }

  const items = data ?? [];
  const showErrorEmpty = !isLoading && error;
  const showNoResultsEmpty = !isLoading && !error && items.length === 0;

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search tasks...">
      {showErrorEmpty ? (
        <List.EmptyView title="Could not load tasks" description={error.message} icon={Icon.ExclamationMark} />
      ) : showNoResultsEmpty ? (
        <List.EmptyView title="No tasks found" description="Try a different search." />
      ) : null}
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.label}
          accessories={[
            { icon: Icon.Folder, text: item.note_label },
            {
              tooltip: new Date(item.dueDate).toLocaleDateString("en-US"),
              date: new Date(item.dueDate),
            },
          ]}
          actions={
            <ActionPanel>
              {item.url && <Action.OpenInBrowser title="Source" url={item.url} />}
              <Action.OpenInBrowser
                title="Open in Evernote"
                url={`evernote:///view/${parseInt(item.owner)}/${item.shardId}/${item.note_id}/${item.note_id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
