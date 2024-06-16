import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { promises as fs } from "fs"; // Import the 'fs' module
import { parse } from "./parser"; // Import the 'read-later-parser' module
import path from 'path';
import os from 'os';
import { title } from "process";


interface State {
  error?: unknown; // Explicitly type the 'error' property
  items?: { title: string; url: string }[]; // Update the 'items' property to be an array of objects with 'title' and 'url' properties
}
const readLaterFilePath = path.join(os.homedir(), 'read-later.md');
export default function Command() {
  const [state, setState] = useState<State>({});

  // 从readlater.md中读取url
    useEffect(() => {
        async function fetchData() { // Mark the function as async
        try {
            
            console.log(readLaterFilePath);
            const content = await fs.readFile(readLaterFilePath, "utf-8");
            console.log('content::', content);
            const items = parse(content);
            setState({ items });
        } catch (error) {
            console.error('error', error);
            setState({ error });
        }
        }
    
        fetchData();
    }, []);
    
    const handleDeleteItem = async (itemToDelete: { title: string; url: string }) => {
        try {
    
          
            const updatedItems = state.items?.filter(item => item !== itemToDelete);
            const updatedContent = updatedItems?.map(item => `[${item.title}](${item.url})`).join('\n');
            await fs.writeFile(readLaterFilePath, updatedContent || '');
            setState({ items: updatedItems });
            showToast(Toast.Style.Success, "URL deleted successfully");
          
        } catch (error) {
          console.error('Error deleting URL:', error);
          showToast(Toast.Style.Failure, "Failed to delete URL");
        }
      };

  return (
    <List isLoading={!state.items && !state.error}>
    {state.items?.map((item, index) => (
      <UrlListItem key={index} item={item} onDelete={handleDeleteItem} />
    ))}
  </List>
);
}

function UrlListItem(props: { item: { title: string; url: string }; onDelete: (itemToDelete: { title: string; url: string }) => void }) {
    return (
        <List.Item
        title={props.item.title}
        subtitle={props.item.url}
        actions={<Actions item={props.item} onDelete={props.onDelete} />}
        />
    );
    
}
function Actions(props: { item: { title: string; url: string }, onDelete: (item: { title: string; url: string }) => void }) {
    return (
      <ActionPanel title={props.item.title}>
        <ActionPanel.Section>
          {props.item.url && <Action.OpenInBrowser url={props.item.url} />}
          {props.item.url && <Action.OpenInBrowser url={props.item.url} title="Open Comments in Browser" />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {props.item.url && (
            <Action.CopyToClipboard
              content={props.item.url}
              title="Copy Link"
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Delete"
            style={Action.Style.Destructive}
            onAction={() => props.onDelete(props.item)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
}