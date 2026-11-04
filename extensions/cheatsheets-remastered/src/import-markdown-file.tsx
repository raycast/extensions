import React, { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readLocalMarkdown, LocalMarkdown } from "./local-markdown";
import Service from "./service";

type ImportValues = { title: string; tags: string; description: string };

export function ImportMarkdownFile({ onImported }: { onImported?: () => void }) {
  const { pop } = useNavigation();
  const mounted = useRef(false);
  const selection = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const [files, setFiles] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<LocalMarkdown | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [showErrors, setShowErrors] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selection.current?.abort();
    };
  }, []);

  async function selectFile(paths: string[]) {
    if (saving.current || !mounted.current) return;
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setFiles(paths);
    setLoaded(null);
    setTitle("");
    setTags("");
    setDescription("");
    setFileError(undefined);
    setIsReading(false);
    if (!paths.length) return;
    if (paths.length !== 1) {
      setFileError("Choose one Markdown file.");
      return;
    }
    setIsReading(true);
    try {
      const sheet = await readLocalMarkdown(paths[0], controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setLoaded(sheet);
      setTitle(sheet.title);
      setTags(sheet.tags?.join(", ") || "");
      setDescription(sheet.description || "");
    } catch (error) {
      if (!controller.signal.aborted && mounted.current)
        setFileError(error instanceof Error ? error.message : "Cannot read this file. Select it again.");
    } finally {
      if (!controller.signal.aborted && mounted.current) setIsReading(false);
    }
  }

  async function handleSubmit(values: ImportValues) {
    if (saving.current || isReading || !mounted.current) return;
    setShowErrors(true);
    if (!loaded || !values.title.trim()) return;
    saving.current = true;
    setIsSubmitting(true);
    try {
      const result = await Service.importCustomCheatsheet(
        {
          ...loaded,
          title: values.title,
          tags:
            values.tags === (loaded.tags?.join(", ") || "")
              ? loaded.tags
              : values.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
          description: values.description,
        },
        selection.current?.signal,
      );
      // A resolved result confirms content exists, even after leaving or retrying.
      onImported?.();
      if (!mounted.current) return;
      if (result.status === "duplicate") {
        await showToast({
          style: Toast.Style.Success,
          title: "Already Imported",
          message: `Saved as “${result.sheet.title}”. No changes made.`,
        });
        return;
      }
      pop();
      await showToast({ style: Toast.Style.Success, title: "Imported", message: result.sheet.title });
    } catch (error) {
      if (mounted.current) await showFailureToast(error, { title: "Could Not Import Markdown" });
    } finally {
      saving.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Import Markdown File"
      isLoading={isReading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Markdown File" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose one UTF-8 .md file up to 1 MiB. Import an independent copy; the original file stays unchanged. Identical saved content is skipped." />
      <Form.FilePicker
        id="file"
        title="Markdown File"
        value={files}
        onChange={selectFile}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        error={fileError || (showErrors && !loaded && !isReading ? "Choose a readable Markdown file." : undefined)}
      />
      {loaded && (
        <Form.Description
          title="Loaded Copy"
          text="The selected file's text is ready to import. Select the file again to load later edits. You can edit these details before saving."
        />
      )}
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
        error={showErrors && !title.trim() ? "Title is required" : undefined}
      />
      <Form.TextField id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Tags separated by commas" />
      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  );
}
