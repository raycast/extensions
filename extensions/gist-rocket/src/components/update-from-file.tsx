import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { afterPublish, republish, PublishInput } from "../lib/publish";
import { loadFromPath } from "../lib/file-loader";
import { Theme } from "../lib/render";

export function UpdateFromFile(props: {
  gistId: string;
  currentDescription: string;
  previousFiles: string[];
  onDone?: () => void;
}) {
  const prefs = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [paths, setPaths] = useState<string[]>([]);
  const [description, setDescription] = useState(props.currentDescription);
  const [theme, setTheme] = useState<Theme>((prefs.defaultMarkdownTheme as Theme) ?? "light");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (paths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a file or folder first" });
      return;
    }
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating…" });
    try {
      const input = await loadFromPath(paths[0], { theme, description });
      const finalInput: PublishInput = { ...input, description: description.trim() || input.description };
      const result = await republish(props.gistId, finalInput, { previousFiles: props.previousFiles });
      await toast.hide();
      await afterPublish(result, "Page updated");
      props.onDone?.();
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Page" icon={Icon.Upload} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="path"
        title="File or Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        value={paths}
        onChange={setPaths}
      />
      <Form.TextField id="description" title="Title" value={description} onChange={setDescription} />
      <Form.Dropdown id="theme" title="Markdown Theme" value={theme} onChange={(v) => setTheme(v as Theme)}>
        <Form.Dropdown.Item value="light" title="Light" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark" icon={Icon.Moon} />
        <Form.Dropdown.Item value="auto" title="Auto (system)" icon={Icon.CircleProgress50} />
      </Form.Dropdown>
    </Form>
  );
}
