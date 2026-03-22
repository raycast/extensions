import { Form, ActionPanel, Action, showToast, Toast, popToRoot, List, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { parsePath, tildifyPath } from "./utils";

function updateToast(toast: Toast, style: Toast.Style, title: string, message?: string) {
  toast.style = style;
  toast.title = title;
  toast.message = message;
}

export default function CloneRepo() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [dirs] = parsePath(preferences.repoScanPath);

  if (dirs.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Directories Configured"
          description="Make sure the scan path is configured in preferences and the directories exist."
        />
      </List>
    );
  }

  async function handleSubmit(values: { url: string; directory: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cloning…" });
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("git", ["clone", values.url], { cwd: values.directory }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      updateToast(toast, Toast.Style.Success, "Cloned successfully");
      await popToRoot();
    } catch (err) {
      updateToast(toast, Toast.Style.Failure, "Clone failed", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="Repository URL" placeholder="https://github.com/owner/repo.git" />
      <Form.Dropdown id="directory" title="Clone Into">
        {dirs.map((dir) => (
          <Form.Dropdown.Item key={dir} value={dir} title={tildifyPath(dir)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
