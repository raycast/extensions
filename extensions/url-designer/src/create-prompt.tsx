import { useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

type DesignedUrl = {
  id: string;
  pattern: string;
};

const urlsStorageKey = "designed-urls";

function normalizePattern(input: string) {
  const pattern = input.trim().replace(/\s+/g, "");

  if (!pattern) return "";
  return pattern.startsWith("/") ? pattern : `/${pattern}`;
}

function buildPrompt(urls: DesignedUrl[]) {
  return `${urls.map((url) => url.pattern).join("\n")}\n\nimplement these URL contracts in the app`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Command() {
  const {
    value: storedUrls,
    setValue: setUrls,
    isLoading: isUrlsLoading,
  } = useLocalStorage<DesignedUrl[]>(urlsStorageKey, []);
  const urls = storedUrls ?? [];
  const [editorText, setEditorText] = useState("");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);

  function handleEditorChange(text: string) {
    setEditorText(text);
  }

  async function saveUrl() {
    const pattern = normalizePattern(editorText);

    if (!pattern) return;

    if (urls.some((url) => url.id !== editingUrlId && url.pattern === pattern)) {
      await showToast({ style: Toast.Style.Failure, title: "URL already added" });
      return;
    }

    if (editingUrlId) {
      await setUrls(urls.map((url) => (url.id === editingUrlId ? { ...url, pattern } : url)));
      setEditingUrlId(null);
      setEditorText("");
      return;
    }

    await setUrls([{ id: createId(), pattern }, ...urls]);
    setEditorText("");
  }

  function editUrl(url: DesignedUrl) {
    setEditingUrlId(url.id);
    setEditorText(url.pattern);
  }

  async function removeUrl(id: string) {
    await setUrls(urls.filter((url) => url.id !== id));

    if (id === editingUrlId) {
      setEditingUrlId(null);
      setEditorText("");
    }
  }

  async function moveUrl(id: string, offset: number) {
    const currentIndex = urls.findIndex((url) => url.id === id);
    const nextIndex = currentIndex + offset;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= urls.length) return;

    const nextUrls = [...urls];
    [nextUrls[currentIndex], nextUrls[nextIndex]] = [nextUrls[nextIndex], nextUrls[currentIndex]];
    await setUrls(nextUrls);
  }

  function actionsFor(url?: DesignedUrl) {
    return (
      <ActionPanel>
        <Action title={editingUrlId ? "Save URL" : "Add URL"} icon={Icon.Plus} onAction={saveUrl} />
        {url && (
          <Action
            title="Edit URL"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => editUrl(url)}
          />
        )}
        {url && urls.findIndex((item) => item.id === url.id) > 0 && (
          <Action
            title="Move up"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => moveUrl(url.id, -1)}
          />
        )}
        {url && urls.findIndex((item) => item.id === url.id) < urls.length - 1 && (
          <Action
            title="Move Down"
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => moveUrl(url.id, 1)}
          />
        )}
        {urls.length > 0 && (
          <Action.CopyToClipboard
            title="Copy Prompt"
            content={buildPrompt(urls)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        {url && (
          <Action
            title="Remove URL"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => removeUrl(url.id)}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={isUrlsLoading}
      searchText={editorText}
      searchBarPlaceholder="/type-your-path"
      onSearchTextChange={handleEditorChange}
      actions={actionsFor()}
    >
      {urls.map((url) => (
        <List.Item id={url.id} key={url.id} icon={Icon.Link} title={url.pattern} actions={actionsFor(url)} />
      ))}
    </List>
  );
}
