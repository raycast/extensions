import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { outlineApi, OutlineDocument } from "./api/outline";

interface EditDocumentProps {
  documentId: string;
}

export default function EditDocument({ documentId }: EditDocumentProps) {
  const [document, setDocument] = useState<OutlineDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchDocument() {
      setIsLoading(true);
      try {
        const doc = await outlineApi.getDocumentInfo(documentId);
        setDocument(doc);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load document",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId]);

  async function handleSubmit(values: { title: string; text: string }) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Updating document...",
      });

      await outlineApi.updateDocument(documentId, {
        title: values.title,
        text: values.text,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Document updated",
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!document) {
    return (
      <Form isLoading={isLoading}>
        <Form.TextField id="title" title="Title" placeholder="Loading..." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={document.title}
        placeholder="Document title"
      />
      <Form.TextArea
        id="text"
        title="Content"
        defaultValue={document.text || ""}
        placeholder="Document content in Markdown"
      />
    </Form>
  );
}
