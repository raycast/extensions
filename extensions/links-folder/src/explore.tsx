import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  getApplications,
  Application,
} from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { runAppleScript } from "@raycast/utils";

// --- Types ---
type SavedApp = { name: string; path: string; bundleId?: string };
type LinkItem = { id: string; type: "link"; title: string; url: string; icon?: string; app?: SavedApp };
type FolderItem = { id: string; type: "folder"; title: string; icon?: string; items: AnyItem[] };
type AnyItem = LinkItem | FolderItem;
type LinksData = { items: AnyItem[] };

// --- Helpers ---
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPreferencePath(): string | undefined {
  try {
    const prefs = getPreferenceValues<{ linksPath?: string }>();
    return prefs.linksPath?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function migrateData(data: unknown): LinksData {
  if (data && typeof data === "object" && "items" in data) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) {
      return data as LinksData;
    }
  }

  const items: AnyItem[] = [];

  function convertFolder(f: Record<string, unknown>): FolderItem {
    const subItems: AnyItem[] = [];

    if (Array.isArray(f.folders)) {
      f.folders.forEach((sub: unknown) => subItems.push(convertFolder(sub as Record<string, unknown>)));
    }

    if (Array.isArray(f.links)) {
      f.links.forEach((l: unknown) => {
        const link = l as Record<string, unknown>;
        subItems.push({
          id: (link.id as string) || generateId(),
          type: "link",
          title: (link.title as string) || (link.url as string),
          url: link.url as string,
          icon: link.icon as string | undefined,
          app: link.app as SavedApp | undefined,
        });
      });
    }

    // Strict ordering so icon is above items
    return {
      id: (f.id as string) || generateId(),
      type: "folder",
      title: (f.title as string) || (f.name as string) || "Unnamed Folder",
      icon: f.icon as string | undefined,
      items: subItems,
    };
  }

  if (data && typeof data === "object" && "folders" in data) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.folders)) {
      d.folders.forEach((f: unknown) => items.push(convertFolder(f as Record<string, unknown>)));
    }
  }

  return { items };
}

function loadLinks(): LinksData {
  const prefPath = getPreferencePath();

  const tryLoad = (p: string) => {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
        console.error(`Failed to load links from ${p}:`, e);
      }
    }
    return null;
  };

  const rawData = (prefPath ? tryLoad(prefPath) : null) ||
    tryLoad(path.join(environment.supportPath, "links.json")) ||
    tryLoad(path.join(environment.assetsPath, "links.json")) || { items: [] };

  return migrateData(rawData);
}

function saveLinks(data: LinksData) {
  const prefPath = getPreferencePath();
  const targetPath = prefPath || path.join(environment.supportPath, "links.json");
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
}

function updateFolder(data: LinksData, folderId: string | null, updater: (items: AnyItem[]) => AnyItem[]) {
  if (!folderId) {
    data.items = updater(data.items || []);
    return;
  }
  function traverse(items: AnyItem[]): boolean {
    for (const item of items) {
      if (item.type === "folder") {
        if (item.id === folderId) {
          item.items = updater(item.items || []);
          return true;
        }
        if (item.items && traverse(item.items)) return true;
      }
    }
    return false;
  }
  traverse(data.items);
}

function openUrl(url: string, app?: SavedApp): void {
  const escapedUrl = JSON.stringify(url);
  if (app && process.platform === "darwin") {
    const targetApp = app.bundleId ? `-b ${JSON.stringify(app.bundleId)}` : `-a ${JSON.stringify(app.path)}`;
    execSync(`open ${targetApp} ${escapedUrl}`);
    return;
  }

  if (process.platform === "darwin") {
    execSync(`open ${escapedUrl}`);
  } else if (process.platform === "win32") {
    execSync(`start "" ${escapedUrl}`, { shell: "cmd.exe" });
  } else {
    execSync(`xdg-open ${escapedUrl}`);
  }
}

function getAllLinksData(item: FolderItem): { url: string; app?: SavedApp }[] {
  const data: { url: string; app?: SavedApp }[] = [];
  for (const child of item.items) {
    if (child.type === "link") data.push({ url: child.url, app: child.app });
    else if (child.type === "folder") data.push(...getAllLinksData(child));
  }
  return data;
}

function openAllLinks(folder: FolderItem): void {
  const links = getAllLinksData(folder);
  if (links.length === 0) {
    showToast({ style: Toast.Style.Failure, title: "No links in this folder" });
    return;
  }
  for (const link of links) {
    try {
      openUrl(link.url, link.app);
    } catch (e) {
      console.error(`Failed to open ${link.url}:`, e);
    }
  }
  showToast({
    style: Toast.Style.Success,
    title: `Opened ${links.length} link${links.length === 1 ? "" : "s"}`,
  });
}

function getFavicon(url: string) {
  const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
  return { source: faviconUrl };
}

function getDomainOnly(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.hostname;
  } catch {
    return rawUrl.length > 30 ? `${rawUrl.slice(0, 27)}...` : rawUrl;
  }
}

function deepCloneItem(item: AnyItem): AnyItem {
  if (item.type === "link") {
    return {
      id: generateId(),
      type: "link",
      title: item.title,
      url: item.url,
      icon: item.icon,
      app: item.app ? { ...item.app } : undefined,
    };
  } else {
    return {
      id: generateId(),
      type: "folder",
      title: item.title,
      icon: item.icon,
      items: item.items.map(deepCloneItem),
    };
  }
}

async function getActiveTabFromBrowser(): Promise<{ url: string; title: string } | null> {
  if (process.platform !== "darwin") {
    await showToast({ style: Toast.Style.Failure, title: "Adding from active tab is only supported on macOS" });
    return null;
  }

  const scripts = [
    `try
      tell application "Safari"
        return (URL of front document) & "\\n" & (name of front document)
      end tell
    end try`,
    `try
      tell application "Google Chrome"
        return (URL of active tab of front window) & "\\n" & (title of active tab of front window)
      end tell
    end try`,
  ];

  for (const script of scripts) {
    try {
      const result = await runAppleScript<string>(script, { humanReadableOutput: true });
      const [url, title] = result.split("\n");
      if (url) return { url, title: title || url };
    } catch {
      // ignore and try next
    }
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Could not read active tab",
    message: "Supported: Safari, Google Chrome",
  });
  return null;
}

async function openSystemEmojiPicker() {
  try {
    await runAppleScript(`
      delay 0.2
      tell application "System Events" to key code 49 using {control down, command down}
    `);
  } catch (error) {
    console.error("Failed to open emoji picker:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Action Failed",
      message: "Check Accessibility permissions in System Settings.",
    });
  }
}

// --- Forms ---
function AddLinkForm({ folderId, onComplete }: { folderId: string | null; onComplete: () => void }) {
  const { pop } = useNavigation();
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    getApplications().then((fetchedApps) => {
      setApps(fetchedApps.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  async function handleSubmit(values: { title: string; url: string; icon: string; appId: string }) {
    const selectedApp = apps.find((a) => (a.bundleId || a.path) === values.appId);
    const appToSave = selectedApp
      ? { name: selectedApp.name, path: selectedApp.path, bundleId: selectedApp.bundleId }
      : undefined;

    const data = loadLinks();
    updateFolder(data, folderId, (items) => [
      ...items,
      {
        id: generateId(),
        type: "link",
        title: values.title.trim() || values.url,
        url: values.url.trim(),
        icon: values.icon.trim() || undefined,
        app: appToSave,
      },
    ]);
    saveLinks(data);
    onComplete();
    await showToast(Toast.Style.Success, "Link added");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
          <Action
            title="Open OS Emoji Picker"
            icon={Icon.Airplane}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={openSystemEmojiPicker}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.TextField id="url" title="URL" placeholder="https://…" />
      <Form.Dropdown id="appId" title="Open With" defaultValue="">
        <Form.Dropdown.Item value="" title="Default Browser" icon={Icon.Globe} />
        {apps.map((a) => (
          <Form.Dropdown.Item key={a.path} value={a.bundleId || a.path} title={a.name} icon={{ fileIcon: a.path }} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="icon" title="Icon (Emoji)" placeholder="Press ⌘⇧E to pick" />
    </Form>
  );
}

function EditLinkForm({
  folderId,
  link,
  onComplete,
}: {
  folderId: string | null;
  link: LinkItem;
  onComplete: () => void;
}) {
  const { pop } = useNavigation();
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    getApplications().then((fetchedApps) => {
      setApps(fetchedApps.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  async function handleSubmit(values: { title: string; url: string; icon: string; appId: string }) {
    const selectedApp = apps.find((a) => (a.bundleId || a.path) === values.appId);
    const appToSave = selectedApp
      ? { name: selectedApp.name, path: selectedApp.path, bundleId: selectedApp.bundleId }
      : undefined;

    const data = loadLinks();
    updateFolder(data, folderId, (items) =>
      items.map((i) => {
        if (i.id === link.id) {
          return {
            id: i.id,
            type: "link",
            title: values.title.trim() || values.url,
            url: values.url.trim(),
            icon: values.icon.trim() || undefined,
            app: appToSave,
          };
        }
        return i;
      }),
    );
    saveLinks(data);
    onComplete();
    await showToast(Toast.Style.Success, "Link updated");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Link" onSubmit={handleSubmit} />
          <Action
            title="Open OS Emoji Picker"
            icon={Icon.Airplane}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={openSystemEmojiPicker}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Optional" defaultValue={link.title} />
      <Form.TextField id="url" title="URL" placeholder="https://…" defaultValue={link.url} />
      <Form.Dropdown id="appId" title="Open With" defaultValue={link.app ? link.app.bundleId || link.app.path : ""}>
        <Form.Dropdown.Item value="" title="Default Browser" icon={Icon.Globe} />
        {apps.map((a) => (
          <Form.Dropdown.Item key={a.path} value={a.bundleId || a.path} title={a.name} icon={{ fileIcon: a.path }} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="icon" title="Icon (Emoji)" placeholder="Press ⌘⇧E to pick" defaultValue={link.icon} />
    </Form>
  );
}

function AddFolderForm({ folderId, onComplete }: { folderId: string | null; onComplete: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; icon: string }) {
    const data = loadLinks();
    updateFolder(data, folderId, (items) => [
      ...items,
      {
        id: generateId(),
        type: "folder",
        title: values.title.trim() || "Unnamed",
        icon: values.icon.trim() || undefined,
        items: [],
      },
    ]);
    saveLinks(data);
    onComplete();
    await showToast(Toast.Style.Success, "Folder created");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" onSubmit={handleSubmit} />
          <Action
            title="Open OS Emoji Picker"
            icon={Icon.Airplane}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={openSystemEmojiPicker}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Folder Name" placeholder="My folder" />
      <Form.TextField id="icon" title="Icon (Emoji)" placeholder="Press ⌘⇧E to pick" />
    </Form>
  );
}

function EditFolderForm({
  folderId,
  folder,
  onComplete,
}: {
  folderId: string | null;
  folder: FolderItem;
  onComplete: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; icon: string }) {
    const data = loadLinks();
    updateFolder(data, folderId, (items) =>
      items.map((i) => {
        if (i.id === folder.id) {
          return {
            id: i.id,
            type: "folder",
            title: values.title.trim() || "Unnamed",
            icon: values.icon.trim() || undefined,
            items: (i as FolderItem).items,
          };
        }
        return i;
      }),
    );
    saveLinks(data);
    onComplete();
    await showToast(Toast.Style.Success, "Folder updated");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Folder" onSubmit={handleSubmit} />
          <Action
            title="Open OS Emoji Picker"
            icon={Icon.Airplane}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={openSystemEmojiPicker}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Folder Name" placeholder="My folder" defaultValue={folder.title} />
      <Form.TextField id="icon" title="Icon (Emoji)" placeholder="Press ⌘⇧E to pick" defaultValue={folder.icon} />
    </Form>
  );
}

// --- Main List Component ---
function FolderList({ folderId, breadcrumbs = ["Links Folder"] }: { folderId: string | null; breadcrumbs?: string[] }) {
  const [data, setData] = useState<LinksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    try {
      setData(loadLinks());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [refresh]);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error loading links" description={error} />
      </List>
    );
  }

  if (!data) return <List isLoading />;

  let currentItems: AnyItem[] = [];

  if (folderId) {
    let found = false;
    function find(items: AnyItem[]) {
      for (const item of items) {
        if (item.type === "folder") {
          if (item.id === folderId) {
            currentItems = item.items || [];
            found = true;
            return;
          }
          find(item.items);
          if (found) return;
        }
      }
    }
    find(data.items);
  } else {
    currentItems = data.items;
  }

  const triggerRefresh = () => setRefresh((r) => r + 1);

  async function handleAddLinkFromTab() {
    const active = await getActiveTabFromBrowser();
    if (!active) return;
    const d = loadLinks();
    updateFolder(d, folderId, (items) => [
      ...items,
      { id: generateId(), type: "link", title: active.title, url: active.url },
    ]);
    saveLinks(d);
    triggerRefresh();
    await showToast(Toast.Style.Success, "Link added from active tab");
  }

  function moveItem(itemId: string, delta: number) {
    const d = loadLinks();
    updateFolder(d, folderId, (items) => {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx === -1) return items;
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= items.length) return items;
      const copy = [...items];
      const [moved] = copy.splice(idx, 1);
      copy.splice(newIdx, 0, moved);
      return copy;
    });
    saveLinks(d);
    triggerRefresh();
  }

  function duplicateItem(itemId: string) {
    const d = loadLinks();
    updateFolder(d, folderId, (items) => {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx === -1) return items;

      const original = items[idx];
      const copyItem = deepCloneItem(original);
      copyItem.title = `${copyItem.title} (Copy)`;

      const newItems = [...items];
      newItems.splice(idx + 1, 0, copyItem);
      return newItems;
    });
    saveLinks(d);
    triggerRefresh();
  }

  async function deleteItem(itemId: string) {
    const isFolder = currentItems.find((i) => i.id === itemId)?.type === "folder";
    const ok = await confirmAlert({
      title: `Delete ${isFolder ? "folder" : "link"}?`,
      message: isFolder ? "The folder and all its contents will be removed." : "This link will be permanently deleted.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    const d = loadLinks();
    updateFolder(d, folderId, (items) => items.filter((i) => i.id !== itemId));
    saveLinks(d);
    triggerRefresh();
    await showToast(Toast.Style.Success, "Deleted successfully");
  }

  const ListAddActions = () => (
    <ActionPanel.Section title="Add & Create">
      <Action.Push
        title="Add Link Manually"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        target={<AddLinkForm folderId={folderId} onComplete={triggerRefresh} />}
      />
      <Action
        title="Add Link from Active Tab"
        icon={Icon.AppWindow}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        onAction={handleAddLinkFromTab}
      />
      <Action.Push
        title="Add Folder"
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        target={<AddFolderForm folderId={folderId} onComplete={triggerRefresh} />}
      />
    </ActionPanel.Section>
  );

  return (
    <List navigationTitle={breadcrumbs.join(" → ")} searchBarPlaceholder="Search items...">
      {currentItems.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          icon={item.icon ? item.icon : item.type === "folder" ? Icon.Folder : getFavicon(item.url)}
          title={item.title}
          subtitle={item.type === "folder" ? `${item.items.length} item(s)` : getDomainOnly(item.url)}
          accessories={
            item.type === "link" && item.app
              ? [{ icon: { fileIcon: item.app.path }, tooltip: `Opens in ${item.app.name}` }]
              : undefined
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {item.type === "link" ? (
                  <>
                    {item.app ? (
                      <Action.Open
                        title={`Open in ${item.app.name}`}
                        target={item.url}
                        application={item.app.bundleId || item.app.path}
                        icon={{ fileIcon: item.app.path }}
                      />
                    ) : (
                      <Action.OpenInBrowser title="Open Link" url={item.url} />
                    )}
                    <Action.OpenWith path={item.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                  </>
                ) : (
                  <Action.Push
                    title="Open Folder"
                    icon={item.icon || Icon.Folder}
                    target={<FolderList folderId={item.id} breadcrumbs={[...breadcrumbs, item.title]} />}
                  />
                )}
                {item.type === "folder" && (
                  <Action
                    title="Open All Links in Folder"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => openAllLinks(item)}
                  />
                )}
              </ActionPanel.Section>

              <ActionPanel.Section title="Manage">
                <Action.Push
                  title={item.type === "link" ? "Edit Link" : "Edit Folder"}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    item.type === "link" ? (
                      <EditLinkForm folderId={folderId} link={item} onComplete={triggerRefresh} />
                    ) : (
                      <EditFolderForm folderId={folderId} folder={item} onComplete={triggerRefresh} />
                    )
                  }
                />
                <Action
                  title={item.type === "link" ? "Duplicate Link" : "Duplicate Folder"}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => duplicateItem(item.id)}
                />
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  onAction={() => moveItem(item.id, -1)}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  onAction={() => moveItem(item.id, 1)}
                />
                <Action
                  title={item.type === "link" ? "Delete Link" : "Delete Folder"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => deleteItem(item.id)}
                />
              </ActionPanel.Section>

              <ListAddActions />
            </ActionPanel>
          }
        />
      ))}

      {currentItems.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="Folder is empty"
          description="Use ⌘⇧L to add a link, or ⌘F to add a subfolder."
          actions={
            <ActionPanel>
              <ListAddActions />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function Command() {
  return <FolderList folderId={null} />;
}
