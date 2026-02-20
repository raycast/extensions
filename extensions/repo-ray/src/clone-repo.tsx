import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
  closeMainWindow,
  List,
} from "@raycast/api";
import * as os from "os";
import * as fs from "fs";
import { execFile } from "child_process";

interface Preferences {
  projectDirectories: string;
}

export default function CloneRepo() {
  const prefs = getPreferenceValues<Preferences>();
  const dirs = prefs.projectDirectories
    .split(",")
    .map((d) => d.trim().replace(/^~/, os.homedir()))
    .filter((d) => d && fs.existsSync(d));

  if (dirs.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Directories Configured"
          description="Make sure the configured directories exist on your system."
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
      toast.style = Toast.Style.Success;
      toast.title = "Cloned successfully";
      await popToRoot();
      await closeMainWindow();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Clone failed";
      toast.message = err instanceof Error ? err.message : String(err);
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
          <Form.Dropdown.Item key={dir} value={dir} title={dir.replace(os.homedir(), "~")} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
