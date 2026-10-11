import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { CAPTURE_WORKSPACE_KEY } from "./capture.js";
import { CreateWorkspaceForm } from "./create-workspace.js";
import { addLearnResource, listLearnWorkspaces } from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";
import { normalizeResourceSource, parseTags } from "./resources.js";

export default function AddResource() {
  return <AddResourceForm executable={getLearnExecutable()} />;
}

export function AddResourceForm({
  executable,
  workspace: initialWorkspace,
  onAdded,
  onWorkspaceCreated,
}: {
  executable: string;
  workspace?: string;
  onAdded?: () => Promise<void>;
  onWorkspaceCreated?: () => Promise<unknown>;
}) {
  const { push, pop } = useNavigation();
  const [workspace, setWorkspace] = useState(initialWorkspace || "");
  const [sourceError, setSourceError] = useState<string>();
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const { data, isLoading, error, revalidate } = usePromise(
    listLearnWorkspaces,
    [executable],
    { onError: () => undefined },
  );
  const workspaces = data || [];
  useEffect(() => {
    let current = true;
    if (initialWorkspace || workspace || !data) return;
    void LocalStorage.getItem<string>(CAPTURE_WORKSPACE_KEY)
      .then((saved) => {
        if (current)
          setWorkspace(saved && data.includes(saved) ? saved : data[0] || "");
      })
      .catch(() => {
        if (current) setWorkspace(data[0] || "");
      });
    return () => {
      current = false;
    };
  }, [data, initialWorkspace, workspace]);

  function createWorkspace() {
    push(
      <CreateWorkspaceForm
        executable={executable}
        onCreated={async (name) => {
          await revalidate();
          await onWorkspaceCreated?.();
          setWorkspace(name);
          pop();
        }}
      />,
    );
  }

  async function submit(values: {
    source: string;
    title: string;
    tags: string;
  }) {
    if (submitting.current) return;
    if (!workspaces.includes(workspace)) {
      setWorkspaceError("Choose or create a workspace");
      return;
    }
    let source: string;
    try {
      source = normalizeResourceSource(values.source);
    } catch (e) {
      setSourceError((e as Error).message);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await addLearnResource(
        workspace,
        source,
        values.title.trim(),
        parseTags(values.tags),
        executable,
      );
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add resource",
        message: (e as Error).message,
      });
      submitting.current = false;
      setSaving(false);
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Added to ${workspace}`,
      message: "Pending ingestion",
    });
    try {
      if (onAdded) await onAdded();
      else await closeMainWindow();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Resource saved; could not refresh the view",
        message: (e as Error).message,
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || saving}
      navigationTitle="Add Learn Resource"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Resource" onSubmit={submit} />
          <Action
            title="Create Workspace"
            icon={Icon.Plus}
            onAction={createWorkspace}
          />
          <Action title="Reload Workspaces" onAction={revalidate} />
        </ActionPanel>
      }
    >
      {error && (
        <Form.Description
          title="Could Not Load Workspaces"
          text={error.message}
        />
      )}
      {!isLoading && !error && !workspaces.length && (
        <Form.Description text="Create your first workspace using the action menu." />
      )}
      <Form.Dropdown
        id="workspace"
        title="Workspace"
        value={workspace}
        onChange={(name) => {
          setWorkspace(name);
          setWorkspaceError(undefined);
        }}
        error={workspaceError}
      >
        <Form.Dropdown.Item value="" title="Choose a workspace" />
        {workspaces.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="source"
        title="URL or Local Path"
        placeholder="https://example.com/article or /Users/you/notes.pdf"
        error={sourceError}
        onChange={() => setSourceError(undefined)}
        info="HTTP/HTTPS URLs, repositories, and absolute local paths. ~/ is expanded to your home folder."
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional resource title"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="ai, reading"
        info="Separate tags with commas."
      />
      <Form.Description text="Saving adds a pending resource. Ingest it separately when you want local content." />
    </Form>
  );
}
