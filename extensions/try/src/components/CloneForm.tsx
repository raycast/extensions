import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  open,
  showInFinder,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { tryClone } from "../lib/try-cli";
import { basename } from "path";

interface CloneFormProps {
  onSuccess: () => void;
}

export function CloneForm({ onSuccess }: CloneFormProps) {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    // Re-entrancy guard: ignore a second submit while a clone is in flight, so
    // mashing Enter during the pause can't kick off a duplicate clone. This
    // backs up the disabled submit action below.
    if (isCloning) {
      return;
    }

    if (!url.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL required",
        message: "Please enter a git repository URL",
      });
      return;
    }

    setIsCloning(true);

    // Show the progress toast *before* awaiting the clone, and keep the handle so
    // we can mutate it in place when the clone resolves.
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cloning…",
      message: url,
    });

    try {
      const targetPath = await tryClone(url, customName || undefined);
      const dirName = basename(targetPath);

      toast.style = Toast.Style.Success;
      toast.title = "Cloned";
      toast.message = dirName;
      toast.primaryAction = {
        title: "Open",
        onAction: () => open(targetPath),
      };
      toast.secondaryAction = {
        title: "Show in Finder",
        onAction: () => showInFinder(targetPath),
      };

      onSuccess();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      toast.style = Toast.Style.Failure;
      toast.title = "Clone failed";
      toast.message = message;
      toast.primaryAction = {
        title: "Copy Error",
        onAction: () => Clipboard.copy(message),
      };

      // Stay on the form with the URL preserved so the user can fix and retry.
      setIsCloning(false);
    }
  };

  return (
    <Form
      navigationTitle="Clone Repository"
      isLoading={isCloning}
      actions={
        <ActionPanel>
          {/* Hide the submit action while cloning so a second press has nothing to fire. */}
          {!isCloning && <Action.SubmitForm title="Clone" onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Git URL"
        placeholder="https://github.com/user/repo.git"
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.TextField
        id="customName"
        title="Custom Name"
        placeholder="(optional)"
        value={customName}
        onChange={setCustomName}
      />
      <Form.Description
        title="Note"
        text="Clones into ~/src/tries with date-prefixed directory name (YYYY-MM-DD-user-repo)"
      />
    </Form>
  );
}
