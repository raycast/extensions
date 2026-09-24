import {
  LocalStorage,
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  getSelectedText,
  open,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  popToRoot,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Note, Page } from "../lib/api";
import { API_ORIGIN, client, noteUrl, settings } from "../lib/config";
import { createHash } from "node:crypto";
import { CaptureDraft, saveCapture } from "../lib/capture";
import { appendCapture, Folder, folderLabel } from "../lib/presentation";
export interface NoteDraftValues {
  title: string;
  body: string;
  folder: string;
}
export function NoteForm({
  note,
  initialTitle = "",
  root = false,
  draftValues,
}: {
  note?: Note;
  initialTitle?: string;
  root?: boolean;
  draftValues?: NoteDraftValues;
}) {
  const [title, setTitle] = useState(draftValues?.title ?? initialTitle);
  const [body, setBody] = useState(draftValues?.body ?? "");
  const [folder, setFolder] = useState(draftValues?.folder ?? "");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);
  const [bodyError, setBodyError] = useState<string>();
  const [folderError, setFolderError] = useState("");
  const [foldersLoading, setFoldersLoading] = useState(!note);
  const [folderRevision, reloadFolders] = useState(0);
  const [created, setCreated] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const { pop } = useNavigation();
  const [hasRecovery, setHasRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [ready, setReady] = useState(false);
  const journalKey =
    "capture-" +
    createHash("sha256")
      .update(JSON.stringify([API_ORIGIN, settings().apiKey, note?.id || (root ? "new-root" : "new")]))
      .digest("hex");
  useEffect(() => {
    LocalStorage.getItem<string>(journalKey)
      .then((raw) => {
        if (raw) {
          setHasRecovery(true);
          const draft: CaptureDraft = JSON.parse(raw);
          if (
            typeof draft.title !== "string" ||
            typeof draft.body !== "string" ||
            typeof draft.folder !== "string" ||
            typeof draft.uncertain !== "boolean" ||
            (draft.id !== undefined && typeof draft.id !== "string")
          )
            throw new Error("Invalid saved recovery");
          // A completed capture may remain when best-effort cleanup failed.
          if (!draft.body && !draft.uncertain) {
            setHasRecovery(false);
            setReady(true);
            return;
          }
          setTitle(draft.title);
          setBody(draft.body);
          setFolder(draft.folder);
          setCreated(draft.id);
          setUncertain(draft.uncertain);
        }
        setReady(true);
      })
      .catch(() => {
        setHasRecovery(true);
        setRecoveryError("Saved recovery could not be read. Use Discard Saved Recovery in Actions to start again.");
      });
  }, [journalKey]);
  async function persist(draft: CaptureDraft) {
    await LocalStorage.setItem(journalKey, JSON.stringify(draft));
    setHasRecovery(true);
    setCreated(draft.id);
    setUncertain(draft.uncertain);
  }
  useEffect(() => {
    if (note) return;
    const abort = new AbortController();
    setFoldersLoading(true);
    setFolderError("");
    setFolders([]);
    async function load() {
      let cursor = "";
      do {
        const page = await client().request<Page<Folder>>(
          "/v1/folders?" + new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) }),
          "GET",
          undefined,
          abort.signal,
        );
        setFolders((old) => [...old, ...page.results]);
        cursor = page.has_more ? page.next_cursor || "" : "";
      } while (cursor);
    }
    load()
      .catch((error) => {
        if (!abort.signal.aborted) setFolderError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setFoldersLoading(false);
      });
    return () => abort.abort();
  }, [note, folderRevision]);
  async function submit() {
    if (lock.current || uncertain || !ready) return;
    const validationError = validateBody(body);
    setBodyError(validationError);
    const invalidTitle = title.length > 1000 ? "Use at most 1,000 characters." : undefined;
    setTitleError(invalidTitle);
    if (validationError || invalidTitle) return;
    lock.current = true;
    setBusy(true);
    let id = note?.id || created;
    let toast: Toast | undefined;
    try {
      toast = await showToast({ style: Toast.Style.Animated, title: note ? "Appending text…" : "Saving note…" });
      id = await saveCapture(client(), { title, body, folder, id, uncertain: false }, persist);
      // saveCapture durably cleared the pending body; cleanup must not turn a saved write into a retry.
      await LocalStorage.removeItem(journalKey).catch(() => undefined);
      toast.style = Toast.Style.Success;
      toast.title = note ? "Text appended" : "Note created";
      toast.primaryAction = { title: "Open Note", onAction: () => open(noteUrl(id!)) };
      setBody("");
      setCreated(undefined);
      setUncertain(false);
      setHasRecovery(false);
      setTitle("");
      setFolder("");
      if (root) await popToRoot();
      else pop();
    } catch (e) {
      const options = {
        style: Toast.Style.Failure,
        title: id ? "Could not save text" : "Could not create note",
        message: e instanceof Error ? e.message : String(e),
      };
      if (toast) Object.assign(toast, options);
      else await showToast(options);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function validateBody(value: string) {
    if (note && !value.trim()) return "Enter text to append.";
    if (value.length > 262144) return "Use at most 262,144 characters.";
    return undefined;
  }
  function changeBody(value: string) {
    if (lock.current) return;
    setBody(value);
    setBodyError(undefined);
  }
  async function insert(source: "clipboard" | "selection") {
    if (lock.current) return;
    try {
      const text = source === "clipboard" ? await Clipboard.readText() : await getSelectedText();
      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "No text available" });
        return;
      }
      if (!lock.current) {
        setBody((current) => appendCapture(current, text));
        setBodyError(undefined);
      }
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "No text available" });
    }
  }
  return (
    <Form
      enableDrafts={root}
      isLoading={busy || (!ready && !recoveryError) || foldersLoading}
      navigationTitle={root ? undefined : note ? "Append to Note" : "Create Note"}
      actions={
        <ActionPanel>
          {(busy || !uncertain) && ready && (
            <Action.SubmitForm
              title={busy ? "Saving…" : note ? "Append Text" : created ? "Save Text to Created Note" : "Create Note"}
              icon={note ? Icon.Pencil : Icon.Plus}
              onSubmit={submit}
            />
          )}
          {hasRecovery && !busy && (
            <Action
              title="Discard Saved Recovery"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (lock.current) return;
                if (
                  !(await confirmAlert({
                    title: "Discard Saved Recovery?",
                    message:
                      "This removes the local recovery text and clears this form. Your saved note in Prismical is kept.",
                    primaryAction: { title: "Discard", style: Alert.ActionStyle.Destructive },
                  }))
                )
                  return;
                if (lock.current) return;
                await LocalStorage.removeItem(journalKey);
                setCreated(undefined);
                setUncertain(false);
                setBody("");
                setBodyError(undefined);
                setHasRecovery(false);
                setRecoveryError("");
                setReady(true);
              }}
            />
          )}
          {folderError && (
            <Action
              title="Retry Loading Folders"
              icon={Icon.ArrowClockwise}
              onAction={() => reloadFolders((n) => n + 1)}
            />
          )}
          <Action title="Use Clipboard" icon={Icon.Clipboard} onAction={() => insert("clipboard")} />
          <Action title="Use Selected Text" icon={Icon.Text} onAction={() => insert("selection")} />
          {(note?.id || created) && (
            <Action.OpenInBrowser title="Check Note in Prismical" url={noteUrl((note?.id || created)!)} />
          )}
          {uncertain && !busy && (
            <Action
              title="I Checked — Allow Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                if (lock.current) return;
                return persist({ title, body, folder, id: note?.id || created, uncertain: false });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {recoveryError && <Form.Description title="Could Not Restore Recovery" text={recoveryError} />}
      {uncertain && !busy && (
        <Form.Description
          title="Check Before Retrying"
          text="The request may have saved. Check Prismical before allowing a retry to avoid duplicate text or notes. Your draft is preserved."
        />
      )}
      {created && !note && !busy && (
        <Form.Description title="Note Created" text="The note already exists. Saving again writes to that same note." />
      )}
      {folderError && (
        <Form.Description
          title="Could Not Load Folders"
          text={`${folderError} Use Retry Loading Folders in Actions, or save without choosing a folder.`}
        />
      )}
      {!note && (!created || busy) && (
        <>
          <Form.TextField
            id="title"
            title="Title"
            value={title}
            onChange={(value) => {
              if (!lock.current) {
                setTitle(value);
                setTitleError(undefined);
              }
            }}
            error={titleError}
            onBlur={(event) =>
              setTitleError((event.target.value || "").length > 1000 ? "Use at most 1,000 characters." : undefined)
            }
            placeholder="Optional title"
          />
          <Form.Dropdown
            id="folder"
            title="Folder"
            value={folder}
            onChange={(value) => {
              if (!lock.current) setFolder(value);
            }}
          >
            <Form.Dropdown.Item value="" title="No Folder" />
            {folder && !folders.some((f) => f.id === folder) && (
              <Form.Dropdown.Item
                value={folder}
                title={foldersLoading ? "Loading Saved Folder…" : "Saved Folder (Unavailable)"}
              />
            )}
            {folders.map((f) => (
              <Form.Dropdown.Item key={f.id} value={f.id} title={folderLabel(f, folders)} />
            ))}
          </Form.Dropdown>
        </>
      )}
      <Form.TextArea
        enableMarkdown
        id="body"
        title={note ? "Text to Append" : "Note"}
        value={body}
        onChange={changeBody}
        error={bodyError}
        onBlur={(event) => {
          if (!lock.current) setBodyError(validateBody(event.target.value || ""));
        }}
        placeholder="Write in Markdown…"
      />
    </Form>
  );
}
