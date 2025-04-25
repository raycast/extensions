import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { TagForm, useTag } from "./features/tag";
import { Page } from "./types";
import { getMetadata } from "./utils/metadata";

export default function Command() {
  const [url, setUrl] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const { tags, isLoading, createTag } = useTag();

  async function handleSubmit() {
    if (!url) {
      showToast({
        style: Toast.Style.Failure,
        title: "URL is required!",
      });
      return;
    }

    try {
      const metadata = await getMetadata(url);
      const pagesData = await LocalStorage.getItem<string>("pages");
      const pagesArray = pagesData ? JSON.parse(pagesData) : [];

      const newPage: Page = {
        url,
        title: metadata.title,
        description: metadata.description,
        imageUrl: metadata.image,
        faviconUrl: metadata.favicon,
        isRead: false,
        tagIds: selectedTagIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedPages = [...pagesArray, newPage];
      await LocalStorage.setItem("pages", JSON.stringify(updatedPages));

      showToast({
        style: Toast.Style.Success,
        title: "Page added successfully!",
      });

      setUrl("");
      setSelectedTagIds([]);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add page",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (isCreatingTag) {
    return (
      <TagForm
        onSubmit={async (values) => {
          const success = await createTag({ name: values.name, color: values.color });
          if (success) {
            setIsCreatingTag(false);
          }
        }}
        onCancel={() => setIsCreatingTag(false)}
        submitTitle="Create Tag"
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Page with Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Page" onSubmit={handleSubmit} />
          <Action
            icon={Icon.Plus}
            title="Create New Tag"
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => setIsCreatingTag(true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL" value={url} onChange={setUrl} />
      {tags.length > 0 && (
        <Form.TagPicker id="tags" title="Tags" value={selectedTagIds} onChange={setSelectedTagIds}>
          {tags.map((tag) => (
            <Form.TagPicker.Item
              key={tag.id}
              value={tag.id}
              title={tag.name}
              icon={{ source: Icon.CircleFilled, tintColor: tag.color }}
            />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
