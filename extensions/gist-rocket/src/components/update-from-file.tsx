import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { afterPublish, republish, PublishInput } from "../lib/publish";
import { detectKind, inlineLocalAssets, suggestedTitle, wrapHtmlFragment, baseFileName } from "../lib/html";
import { renderMarkdownToHtml, Theme } from "../lib/render";

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

async function loadFromPath(p: string, opts: { theme: Theme; description: string }): Promise<PublishInput> {
  const s = await stat(p);
  if (s.isDirectory()) {
    const indexPath = join(p, "index.html");
    const raw = await readFile(indexPath, "utf8").catch(() => {
      throw new Error("Folder must contain an index.html");
    });
    const inlined = await inlineLocalAssets(raw, indexPath);
    return {
      kind: "html",
      source: inlined,
      preRenderedHtml: inlined,
      description: opts.description || suggestedTitle(inlined, "Untitled page"),
      visibility: "secret",
      theme: opts.theme,
    };
  }
  const raw = await readFile(p, "utf8");
  const kind = detectKind(p, true);
  if (kind === "markdown") {
    const html = await renderMarkdownToHtml(raw, { theme: opts.theme, title: opts.description || undefined });
    return {
      kind: "markdown",
      source: raw,
      preRenderedHtml: html,
      description: opts.description || suggestedTitle(raw, baseFileName(p)),
      visibility: "secret",
      theme: opts.theme,
      sourceFilename: "source.md",
    };
  }
  const inlined = await inlineLocalAssets(raw, p);
  const wrapped = wrapHtmlFragment(inlined, opts.description || undefined);
  return {
    kind: "html",
    source: wrapped,
    preRenderedHtml: wrapped,
    description: opts.description || suggestedTitle(wrapped, baseFileName(p)),
    visibility: "secret",
    theme: opts.theme,
  };
}
