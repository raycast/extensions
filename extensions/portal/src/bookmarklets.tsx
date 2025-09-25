import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  List,
  showToast,
  ToastStyle,
  Icon,
  useNavigation,
  closeMainWindow,
} from "@raycast/api";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

type Bookmark = {
  id: string;
  name: string;
  js: string;
  createdAt: string;
};

const STORAGE_PATH = path.join(
  process.env.HOME ?? "~",
  ".raycast",
  "bookmarklets.json",
);

function ensureStorageDir() {
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(STORAGE_PATH, "[]", { encoding: "utf-8" });
  }
}

function loadBookmarks(): Bookmark[] {
  try {
    ensureStorageDir();
    const raw = fs.readFileSync(STORAGE_PATH, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveBookmarks(items: Bookmark[]) {
  ensureStorageDir();
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(items, null, 2), "utf8");
}

function escapeForAppleScript(js: string) {
  return js.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function buildAppleScript(jsEscaped: string) {
  return `if application "Google Chrome" is running then
  tell application "Google Chrome"
    if not (exists window 1) then return
    tell active tab of front window to execute javascript "${jsEscaped}"
  end tell
else if application "Safari" is running then
  tell application "Safari"
    if not (exists window 1) then return
    do JavaScript "${jsEscaped}" in document 1 of front window
  end tell
else
  error "No supported browser is running."
end if`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function appRunning(app: string) {
  try {
    const out = execFileSync(
      "osascript",
      ["-e", `application "${app}" is running`],
      { encoding: "utf8" },
    );
    return out.toString().trim() === "true";
  } catch {
    return false;
  }
}

function toChunkedBase64(src: string, chunk = 600) {
  const b64 = Buffer.from(src, "utf8").toString("base64");
  const arr: string[] = [];
  for (let i = 0; i < b64.length; i += chunk) arr.push(b64.slice(i, i + chunk));
  return arr;
}

function buildChunkedWrapperUtf8(src: string) {
  const chunks = toChunkedBase64(src, 600);
  const arr = chunks.map((c) => `'${c}'`).join(",");
  return `(function(chunks){try{let b64=chunks.join('').replace(/[\\s\\r\\n]/g,'');b64+='='.repeat((4-(b64.length%4))%4);var bin=atob(b64);var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);var decoded=(window.TextDecoder?new TextDecoder('utf-8').decode(bytes):decodeURIComponent(escape(bin)));var s=document.createElement('script');s.textContent=decoded;document.documentElement.appendChild(s);s.remove();}catch(e){console.error('[INJECT][ERROR]',e&&(e.stack||e));}})([${arr}]);`;
}

async function runBookmarklet(jsSource: string) {
  try {
    const raw = jsSource.trim();
    if (!raw) return false;
    const wrapper = buildChunkedWrapperUtf8(raw);
    const inject = buildAppleScript(escapeForAppleScript(wrapper));
    try {
      await closeMainWindow({ clearRootSearch: true });
    } catch {
      void 0;
    }
    await sleep(150);
    execFileSync("osascript", ["-e", inject], { stdio: "ignore" });
    await sleep(150);
    if (appRunning("Google Chrome")) {
      execFileSync("open", ["-a", "Google Chrome"]);
    } else if (appRunning("Safari")) {
      execFileSync("open", ["-a", "Safari"]);
    }
    return true;
  } catch {
    return false;
  }
}

function sortByName(items: Bookmark[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "ko", { sensitivity: "base", numeric: true }),
  );
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeDuplicateDraft(b: Bookmark): Bookmark {
  return {
    id: makeId(),
    name: `${b.name} (Copy)`,
    js: b.js,
    createdAt: new Date().toISOString(),
  };
}

export default function Command() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const items = loadBookmarks();
    setBookmarks(sortByName(items));
    setLoading(false);
  }, []);

  function addBookmark(b: Bookmark) {
    const next = [b, ...bookmarks];
    saveBookmarks(next);
    setBookmarks(sortByName(next));
  }

  function updateBookmark(updated: Bookmark) {
    const next = bookmarks.map((b) => (b.id === updated.id ? updated : b));
    saveBookmarks(next);
    setBookmarks(sortByName(next));
  }

  function deleteBookmark(id: string) {
    const next = bookmarks.filter((b) => b.id !== id);
    saveBookmarks(next);
    setBookmarks(sortByName(next));
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarklets">
      <List.Section title="Bookmarklets" subtitle={`${bookmarks.length}`}>
        <List.Item
          id="__create__"
          title="Add New Bookmarklet"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Bookmarklet"
                icon={Icon.Plus}
                target={<BookmarkForm onSave={addBookmark} />}
              />
            </ActionPanel>
          }
        />
        {bookmarks.map((bm) => (
          <List.Item
            key={bm.id}
            id={bm.id}
            title={bm.name}
            subtitle={new Date(bm.createdAt).toLocaleString()}
            actions={
              <ActionPanel>
                <Action
                  title="Run Bookmarklet"
                  icon={Icon.Play}
                  onAction={async () => {
                    await runBookmarklet(bm.js);
                  }}
                />
                <Action.Push
                  title="Edit Bookmarklet"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <BookmarkForm
                      bookmark={bm}
                      onSave={updateBookmark}
                      onDelete={() => deleteBookmark(bm.id)}
                    />
                  }
                />
                <Action.Push
                  title="Duplicate"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <BookmarkForm
                      bookmark={makeDuplicateDraft(bm)}
                      onSave={addBookmark}
                    />
                  }
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: "Delete bookmarklet?",
                      message: `Delete "${bm.name}"`,
                    });
                    if (ok) deleteBookmark(bm.id);
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={bm.js}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function BookmarkForm(props: {
  bookmark?: Bookmark;
  onSave: (b: Bookmark) => void;
  onDelete?: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name?: string; js?: string }) {
    const now = new Date().toISOString();
    const bm: Bookmark = {
      id: props.bookmark?.id ?? makeId(),
      name: values.name?.trim() || "Untitled",
      js: values.js ?? "",
      createdAt: props.bookmark?.createdAt ?? now,
    };
    props.onSave(bm);
    await showToast(
      ToastStyle.Success,
      props.bookmark ? "Bookmarklet saved" : "Bookmarklet created",
    );
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.bookmark ? "Save" : "Create"}
            icon={props.bookmark ? Icon.Checkmark : Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={handleSubmit}
          />
          {props.bookmark && props.onDelete ? (
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: "Delete bookmarklet?",
                  message: `Delete "${props.bookmark?.name}"`,
                });
                if (!ok) return;
                props.onDelete?.();
                await showToast(ToastStyle.Success, "Bookmarklet deleted");
                pop();
              }}
            />
          ) : null}
          <Action title="Cancel" icon={Icon.ArrowLeft} onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={props.bookmark?.name ?? ""}
      />
      <Form.TextArea
        id="js"
        title="Bookmarklet JS"
        defaultValue={props.bookmark?.js ?? ""}
      />
    </Form>
  );
}
