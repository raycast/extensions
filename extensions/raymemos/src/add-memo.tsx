/**
 * Add Memo Command
 * Provides a form interface for creating new memos with content, visibility settings,
 * and file attachments. Handles the upload of attachments and creation of memos
 * through the API.
 */

import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { uploadResource, createMemo, getMimeType } from "./api";

/**
 * Interface for the form values submitted when creating a new memo
 */
interface FormValues {
  content: string;
  visibility: string;
  file: string[];
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      let resources: { name: string }[] | undefined;

      if (values.file && values.file.length > 0) {
        const filePath = values.file[0];
        const fileName = filePath.split("/").pop() || "file";
        console.log("Uploading file:", { filePath, fileName });

        const uploadResponse = await uploadResource(filePath, fileName, getMimeType(fileName));
        resources = [{ name: uploadResponse.name }];
      }

      await createMemo({
        content: values.content,
        visibility: values.visibility as "PUBLIC" | "PROTECTED" | "PRIVATE",
        resources,
      });

      showToast({ title: "Memo created", style: Toast.Style.Success });
    } catch (error) {
      console.error("Error:", error);
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new memo." />
      <Form.TextArea id="content" title="Memo Content" placeholder="Fill in your memo here" enableMarkdown />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="PRIVATE">
        <Form.Dropdown.Item value="PUBLIC" title="Public" />
        <Form.Dropdown.Item value="PROTECTED" title="Protected" />
        <Form.Dropdown.Item value="PRIVATE" title="Private" />
      </Form.Dropdown>
      <Form.FilePicker id="file" title="Attachment" allowMultipleSelection={false} />
    </Form>
  );
}
