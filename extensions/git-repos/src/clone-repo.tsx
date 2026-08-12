import { Form, ActionPanel, Action, showToast, Toast, popToRoot, List, getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { execFile } from "child_process";
import { parsePath, tildifyPath } from "./utils";

function updateToast(toast: Toast, style: Toast.Style, title: string, message?: string) {
  toast.style = style;
  toast.title = title;
  toast.message = message;
}

interface CloneFormValues {
  url: string;
  directory: string;
}

export default function CloneRepo() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [dirs] = parsePath(preferences.repoScanPath);

  const { handleSubmit, itemProps } = useForm<CloneFormValues>({
    async onSubmit(values) {
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
    },
    validation: {
      url: FormValidation.Required,
    },
  });

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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Repository URL" placeholder="https://github.com/owner/repo.git" {...itemProps.url} />
      <Form.Dropdown title="Clone Into" {...itemProps.directory}>
        {dirs.map((dir) => (
          <Form.Dropdown.Item key={dir} value={dir} title={tildifyPath(dir)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
