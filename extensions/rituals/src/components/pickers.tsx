import { Action, ActionPanel, Icon, List, Toast, getApplications, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import LibraryPicker, { PickerSection } from "./LibraryPicker";
import FilePickerForm from "./FilePickerForm";

export function AppPicker({ onPick }: { onPick: (value: string) => void }) {
  const { data: apps = [], isLoading } = useCachedPromise(async () => {
    const result = await getApplications();
    return result.sort((a, b) => a.name.localeCompare(b.name));
  });

  const sections: PickerSection[] = [
    {
      title: "Installed Apps",
      items: apps.map((app) => ({
        id: app.path,
        title: app.name,
        icon: { fileIcon: app.path },
        value: app.name,
      })),
    },
  ];

  return (
    <LibraryPicker
      navigationTitle="Add App"
      searchBarPlaceholder="Search installed apps…"
      isLoading={isLoading}
      sections={sections}
      custom={{ label: (text) => `Add "${text}"`, build: (text) => text, icon: Icon.AppWindow }}
      onPick={onPick}
    />
  );
}

export function UrlPicker({ onPick }: { onPick: (value: string) => void }) {
  const [text, setText] = useState("");
  const url = normalizeUrl(text.trim());
  const valid = text.trim().length > 0;

  function add() {
    onPick(url);
    showToast({ style: Toast.Style.Success, title: "Added", message: url });
    setText("");
  }

  return (
    <List
      navigationTitle="Add Website"
      searchBarPlaceholder="Type a URL and press ↵ (add as many as you want)…"
      searchText={text}
      onSearchTextChange={setText}
      filtering={false}
    >
      {valid ? (
        <List.Item
          icon={Icon.Globe}
          title={`Add  ${url}`}
          actions={
            <ActionPanel>
              <Action title="Add Website" icon={Icon.Plus} onAction={add} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title="Add a website"
          description="Type a URL (e.g. github.com) and press ↵"
        />
      )}
    </List>
  );
}

export function FilesPicker({ onPick }: { onPick: (value: string) => void }) {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const valid = text.trim().length > 0;

  function add() {
    onPick(text.trim());
    showToast({ style: Toast.Style.Success, title: "Added", message: text.trim() });
    setText("");
  }

  const browse = (
    <Action
      title="Browse Files & Folders…"
      icon={Icon.Finder}
      onAction={() => push(<FilePickerForm onPick={onPick} />)}
    />
  );

  return (
    <List
      navigationTitle="Add Files & Folders"
      searchBarPlaceholder="Type a path (~/… ), or pick Browse…"
      searchText={text}
      onSearchTextChange={setText}
      filtering={false}
    >
      {valid && (
        <List.Item
          icon={Icon.Finder}
          title={`Add  ${text.trim()}`}
          actions={
            <ActionPanel>
              <Action title="Add Path" icon={Icon.Plus} onAction={add} />
              {browse}
            </ActionPanel>
          }
        />
      )}
      <List.Item
        icon={Icon.Finder}
        title="Browse Files & Folders…"
        subtitle="Open the macOS picker"
        actions={<ActionPanel>{browse}</ActionPanel>}
      />
    </List>
  );
}

function normalizeUrl(text: string): string {
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  return `https://${text}`;
}
