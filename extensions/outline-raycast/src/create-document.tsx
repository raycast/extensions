import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
  open,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { outlineApi, Collection } from "./api/outline";

export default function Command() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const data = await outlineApi.listCollections();
        setCollections(data);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load collections",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCollections();
  }, []);

  async function handleSubmit(values: {
    title: string;
    collectionId: string;
    text: string;
  }) {
    if (!values.title || !values.collectionId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please provide a title and select a collection",
      });
      return;
    }

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Creating document...",
      });

      const document = await outlineApi.createDocument(
        values.title,
        values.collectionId,
        values.text,
      );

      showToast({
        style: Toast.Style.Success,
        title: "Document created",
        message: values.title,
      });

      // Open the document in browser
      const url = outlineApi.getDocumentUrl(document);
      await open(url);

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create document",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter document title"
      />
      <Form.Dropdown
        id="collectionId"
        title="Collection"
        placeholder="Select a collection"
      >
        {collections.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            value={collection.id}
            title={collection.name}
            icon={collection.icon}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Content (Optional)"
        placeholder="Enter initial content in Markdown format"
      />
    </Form>
  );
}
