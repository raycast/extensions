import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { CAPTURE_WORKSPACE_KEY } from "./capture.js";
import { createLearnWorkspace } from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";

export default function CreateWorkspace() {
  return <CreateWorkspaceForm executable={getLearnExecutable()} />;
}

export function CreateWorkspaceForm({
  executable,
  onCreated,
}: {
  executable: string;
  onCreated?: (workspace: string) => Promise<void>;
}) {
  const submitting = useRef(false);
  const createdWorkspace = useRef<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string>();

  async function submit(values: { name: string }) {
    if (submitting.current) return;
    const name = values.name.trim();
    if (
      !name ||
      name === "." ||
      name === ".." ||
      /[/\\]/.test(name) ||
      name.includes(String.fromCharCode(0))
    ) {
      setNameError("Enter a workspace name without path separators");
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    try {
      // A storage or navigation failure can be retried without creating it twice.
      if (createdWorkspace.current !== name) {
        await createLearnWorkspace(name, executable);
        createdWorkspace.current = name;
      }
      await LocalStorage.setItem(CAPTURE_WORKSPACE_KEY, name);
      await showToast({
        style: Toast.Style.Success,
        title: `Created ${name}`,
        message: "Selected for browser capture",
      });
      if (onCreated) {
        await onCreated(name);
      } else {
        await closeMainWindow();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not finish workspace setup",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Learn Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workspace Name"
        placeholder="browser-agents"
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="Create a local learning workspace and use it for future browser captures."
      />
    </Form>
  );
}
