import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
  open,
  showHUD,
} from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import { useState, useEffect } from 'react';
import { ContextItem } from './types';

export default function Command() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const json = await LocalStorage.getItem<string>('items');
      const loadedItems: ContextItem[] = json ? JSON.parse(json) : [];
      setItems(loadedItems);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: 'Failed to load items' });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteItem(id: string) {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    await LocalStorage.setItem('items', JSON.stringify(newItems));
    showToast({ style: Toast.Style.Success, title: 'Item deleted' });
  }

  async function restoreItem(item: ContextItem) {
    // Copy to clipboard
    await Clipboard.copy(item.content);

    let restored = false;

    // 1. Try Opening URL directly (best for browsers to restore exact tab)
    if (item.url) {
      try {
        await open(item.url);
        restored = true;
      } catch (e) {
        console.error('Failed to open URL', e);
      }
    }

    // 2. Fallback: Activate App (if URL didn't work or doesn't exist)
    if (!restored && item.appBundleId) {
      try {
        await runAppleScript(`tell application id "${item.appBundleId}" to activate`);
      } catch (e) {
        console.error('Failed to activate app', e);
      }
    }

    // Notify and close using HUD
    await showHUD('Context Active');
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter stack...">
      {items.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Tray, tintColor: Color.SecondaryText }}
          title="Stack is empty"
          description="Use the 'Capture Context' command to add items."
        />
      ) : (
        // Display reversed so newest is on top
        [...items].reverse().map((item) => (
          <List.Item
            key={item.id}
            title={item.content}
            subtitle={item.tabTitle || item.url || new Date(item.timestamp).toLocaleString()}
            icon={Icon.Circle}
            accessories={[item.appName ? { text: item.appName, icon: Icon.AppWindow } : {}]}
            actions={
              <ActionPanel>
                <Action
                  title="Restore Context"
                  icon={Icon.Clipboard}
                  onAction={() => restoreItem(item)}
                />
                {item.url && (
                  <Action.OpenInBrowser
                    title="Open URL"
                    url={item.url}
                    shortcut={{ modifiers: ['opt'], key: 'enter' }}
                  />
                )}
                <Action
                  title="Delete Item"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                  onAction={() => deleteItem(item.id)}
                />
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={item.content}
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
