import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
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
    if (!url.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "URL required",
        message: "Please enter a git repository URL",
      });
      return;
    }

    setIsCloning(true);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Cloning...",
        message: url,
      });

      const targetPath = tryClone(url, customName || undefined);
      const dirName = basename(targetPath);

      showToast({
        style: Toast.Style.Success,
        title: "Cloned successfully",
        message: dirName,
      });

      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Clone failed",
        message: String(error),
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Form
      navigationTitle="Clone Repository"
      isLoading={isCloning}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone" onSubmit={handleSubmit} />
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
