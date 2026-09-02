import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { createLink, createText, friendlyError, saveFile } from "./api";

type SaveKind = "url" | "text" | "file";

interface SaveFormValues {
  kind: SaveKind;
  url: string;
  title: string;
  text: string;
  files: string[];
}

export default function Command() {
  const [kind, setKind] = useState<SaveKind>("url");
  const [isSaving, setIsSaving] = useState(false);

  async function save(values: SaveFormValues) {
    if (isSaving) return;

    const validationMessage = validate(values);
    if (validationMessage) {
      await showToast({ style: Toast.Style.Failure, title: validationMessage });
      return;
    }

    setIsSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Summy…" });

    try {
      if (values.kind === "url") {
        await createLink(values.url.trim());
      } else if (values.kind === "text") {
        await createText(values.text.trim(), values.title.trim() || undefined);
      } else {
        for (const filePath of values.files) {
          await saveFile(filePath);
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = successTitle(values);
      toast.message = "Summy is summarising it now.";
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn’t Save to Summy";
      toast.message = friendlyError(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle="Save to Summy"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Summy" icon={Icon.Plus} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Save" value={kind} onChange={(value) => setKind(value as SaveKind)}>
        <Form.Dropdown.Item title="A link" value="url" icon={Icon.Link} />
        <Form.Dropdown.Item title="Some text" value="text" icon={Icon.Text} />
        <Form.Dropdown.Item title="A file" value="file" icon={Icon.Document} />
      </Form.Dropdown>

      {kind === "url" ? <Form.TextField id="url" title="URL" placeholder="https://example.com" autoFocus /> : null}

      {kind === "text" ? (
        <>
          <Form.TextField id="title" title="Title" placeholder="Optional" />
          <Form.TextArea
            id="text"
            title="Text"
            placeholder="Paste or type what you want Summy to summarise"
            autoFocus
          />
        </>
      ) : null}

      {kind === "file" ? (
        <Form.FilePicker id="files" title="Files" allowMultipleSelection canChooseDirectories={false} />
      ) : null}

      <Form.Description text="Summy will save your selection and start summarising it straight away." />
    </Form>
  );
}

function validate(values: SaveFormValues): string | undefined {
  if (values.kind === "url") {
    const input = values.url?.trim();
    if (!input) return "Enter a URL to save.";
    try {
      const url = new URL(input);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "Enter a web URL.";
    } catch {
      return "Enter a valid URL.";
    }
  }

  if (values.kind === "text" && !values.text?.trim()) return "Enter some text to save.";
  if (values.kind === "file" && !values.files?.length) return "Choose at least one file.";
  return undefined;
}

function successTitle(values: SaveFormValues): string {
  if (values.kind === "url") return "Link Saved";
  if (values.kind === "text") return "Text Saved";
  return values.files.length === 1 ? "File Saved" : `${values.files.length} Files Saved`;
}
