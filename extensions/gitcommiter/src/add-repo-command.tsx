import { ActionPanel, Form, Action, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function AddRepoCommand() {
  const [repoPath, setRepoPath] = useState<string>("");

  async function handleAddPath() {
    if (!repoPath) {
      showToast(Toast.Style.Failure, "Path cannot be empty");
      return;
    }

    const storedPaths = await LocalStorage.getItem<string>("gitPaths");
    const savedPaths = storedPaths ? JSON.parse(storedPaths) : [];

    if (savedPaths.includes(repoPath)) {
      showToast(Toast.Style.Failure, "Path already exists");
      return;
    }

    const updatedPaths = [...savedPaths, repoPath];
    await LocalStorage.setItem("gitPaths", JSON.stringify(updatedPaths));
    showToast(Toast.Style.Success, "Path Added");
    setRepoPath(""); // Clear input after adding
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Path" onSubmit={handleAddPath} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="repoPath"
        title="Repository Path"
        placeholder="Enter the Git repository path"
        value={repoPath}
        onChange={setRepoPath}
      />
    </Form>
  );
}
