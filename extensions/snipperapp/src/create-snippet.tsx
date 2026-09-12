import { Action, ActionPanel, Clipboard, Form, getSelectedText, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { AppNotInstalled } from "./components/app-not-installed";
import { getCaptureTarget, setCaptureTarget } from "./lib/last-used";
import { useLibraryMeta } from "./lib/meta";
import { createSnippet, isHelperNotFound } from "./lib/snipper-helper";

const NO_LANGUAGE = "plain";

export default function Command() {
  const meta = useLibraryMeta();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState(NO_LANGUAGE);
  const [workspaceId, setWorkspaceId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the current selection, else the clipboard. Restore last capture target.
  useEffect(() => {
    (async () => {
      let text = "";
      try {
        text = await getSelectedText();
      } catch {
        // no selection
      }
      if (!text) {
        try {
          text = (await Clipboard.readText()) ?? "";
        } catch {
          // empty clipboard
        }
      }
      if (text) {
        setContent(text);
        const firstLine =
          text
            .split("\n")
            .find((line) => line.trim().length > 0)
            ?.trim() ?? "";
        setTitle(firstLine.slice(0, 80));
      }
      const target = await getCaptureTarget();
      if (target.workspaceId) setWorkspaceId(target.workspaceId);
      if (target.folderId) setFolderId(target.folderId);
      setLoadingInitial(false);
    })();
  }, []);

  // Default to the first workspace once metadata loads (if none restored).
  useEffect(() => {
    if (!workspaceId && meta.data?.workspaces.length) setWorkspaceId(meta.data.workspaces[0].id);
  }, [meta.data, workspaceId]);

  const workspaceFolders = useMemo(
    () => (meta.data?.folders ?? []).filter((folder) => meta.data?.folderWorkspace.get(folder.id) === workspaceId),
    [meta.data, workspaceId],
  );

  if (isHelperNotFound(meta.error)) return <AppNotInstalled />;

  async function submit() {
    if (!content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Content is empty" });
      return;
    }
    setSubmitting(true);
    try {
      await createSnippet({
        title: title.trim() || "Untitled",
        content,
        language: language !== NO_LANGUAGE ? language : undefined,
        workspace_id: workspaceId || undefined,
        folder_id: folderId || undefined,
      });
      await setCaptureTarget({ workspaceId: workspaceId || undefined, folderId: folderId || undefined });
      await showToast({ style: Toast.Style.Success, title: "Snippet created" });
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't create snippet" });
    } finally {
      setSubmitting(false);
    }
  }

  const languages = meta.data ? Array.from(meta.data.languages.values()) : [];

  return (
    <Form
      isLoading={loadingInitial || meta.isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snippet" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Snippet title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste or type code…"
        value={content}
        onChange={setContent}
      />
      <Form.Dropdown id="language" title="Language" value={language} onChange={setLanguage}>
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.id} value={lang.id} title={lang.displayName} />
        ))}
      </Form.Dropdown>
      {meta.data && meta.data.workspaces.length > 0 && (
        <Form.Dropdown id="workspace" title="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {meta.data.workspaces.map((workspace) => (
            <Form.Dropdown.Item
              key={workspace.id}
              value={workspace.id}
              title={workspace.name}
              icon={Icon.AppWindowGrid2x2}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="folder" title="Folder" value={folderId} onChange={setFolderId}>
        <Form.Dropdown.Item value="" title="No folder" icon={Icon.Tray} />
        {workspaceFolders.map((folder) => (
          <Form.Dropdown.Item key={folder.id} value={folder.id} title={folder.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
