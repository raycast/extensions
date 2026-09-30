import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { wp } from "../utils/api";
import { usePages } from "../utils/hooks";
import { WPPage, CreatePageParams } from "../utils/types";
import { getTitle } from "../utils/helpers";

interface PageFormProps {
  page?: WPPage;
  parentId?: number;
  onSuccess?: (page: WPPage) => void;
}

export function PageForm({ page, parentId, onSuccess }: PageFormProps) {
  const { pop } = useNavigation();
  const { data: pages } = usePages({ per_page: 100 });

  const [isLoading, setIsLoading] = useState(false);
  const [titleError, setTitleError] = useState<string>();

  const isEditing = !!page;

  // Filter out current page and its descendants for parent selection
  const availableParents = pages?.filter((p) => {
    if (!page) return true;
    return p.id !== page.id && p.parent !== page.id;
  });

  async function handleSubmit(values: {
    title: string;
    content: string;
    excerpt: string;
    status: string;
    parent: string;
    menuOrder: string;
  }) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    setIsLoading(true);

    const data: CreatePageParams = {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt,
      status: values.status as CreatePageParams["status"],
      parent: values.parent ? Number(values.parent) : 0,
      menu_order: values.menuOrder ? Number(values.menuOrder) : 0,
    };

    try {
      let result: WPPage;

      if (isEditing) {
        result = await wp.updatePage(page.id, data);
        await showToast({
          style: Toast.Style.Success,
          title: "Page updated",
          message: getTitle(result),
        });
      } else {
        result = await wp.createPage(data);
        await showToast({
          style: Toast.Style.Success,
          title: "Page created",
          message: getTitle(result),
        });
      }

      onSuccess?.(result);
      pop();
    } catch (error) {
      // Error toast already shown by API
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEditing ? `Edit: ${getTitle(page)}` : "Create Page"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Page" : "Create Page"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter page title"
        defaultValue={page?.title.raw || page?.title.rendered || ""}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Write your page content (HTML or plain text)"
        defaultValue={page?.content.raw || ""}
        enableMarkdown
      />

      <Form.TextArea
        id="excerpt"
        title="Excerpt"
        placeholder="Brief summary of the page"
        defaultValue={page?.excerpt.raw || ""}
      />

      <Form.Separator />

      <Form.Dropdown id="status" title="Status" defaultValue={page?.status || "draft"}>
        <Form.Dropdown.Item value="draft" title="Draft" />
        <Form.Dropdown.Item value="publish" title="Published" />
        <Form.Dropdown.Item value="pending" title="Pending Review" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>

      <Form.Dropdown id="parent" title="Parent Page" defaultValue={String(parentId || page?.parent || 0)}>
        <Form.Dropdown.Item value="0" title="(no parent)" />
        {availableParents?.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={getTitle(p)} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="menuOrder" title="Menu Order" placeholder="0" defaultValue={String(page?.menu_order || 0)} />
    </Form>
  );
}
