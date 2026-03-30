import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Icon,
  Toast,
  popToRoot,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkFormValues } from "./types";
import { addBookmark } from "./api";
import { usePinboardTags } from "./hooks/usePinboardTags";
import { isValidURL } from "./utils";

export default function Command() {
  const { tags, isLoading: tagsLoading } = usePinboardTags();
  const [isPrefilling, setIsPrefilling] = useState(false);
  const { autoFill } = getPreferenceValues<{ autoFill: boolean }>();

  const { handleSubmit, itemProps, setValue, focus } = useForm<BookmarkFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ title: "Pinning bookmark...", style: Toast.Style.Animated });

      try {
        const bookmark: Bookmark = {
          id: "",
          url: values.url,
          title: values.title,
          description: "",
          tags: values.tags.join(" "),
          private: values.private,
          readLater: values.readLater,
        };
        await addBookmark(bookmark);
        toast.style = Toast.Style.Success;
        toast.title = "Successfully added bookmark";
        popToRoot();
      } catch (error) {
        console.error("addBookmark error", error);
        toast.title = "Could not pin bookmark";
        toast.message = String(error);
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      url: (value) => {
        if (value?.length === 0) {
          return "The item is required";
        } else if (value && !isValidURL(value)) {
          return "Enter a valid URL";
        }
      },
      title: FormValidation.Required,
    },
    initialValues: {
      tags: [],
    },
  });

  useEffect(() => {
    if (!autoFill) return;
    const controller = new AbortController();

    async function prefillFromSelection() {
      let selectedText: string;
      try {
        selectedText = await getSelectedText();
      } catch {
        return; // getSelectedText throws when nothing is selected
      }

      if (!isValidURL(selectedText)) return;
      setValue("url", selectedText);
      setIsPrefilling(true);

      let focusField: "title" | "tags" = "title";
      try {
        const response = await fetch(selectedText, { signal: controller.signal });
        if (response.ok) {
          const html = await response.text();
          const title = extractDocumentTitle(html);
          if (title) {
            setValue("title", title);
            focusField = "tags";
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not fetch page title", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          focus(focusField);
          setIsPrefilling(false);
        }
      }
    }

    prefillFromSelection();
    return () => controller.abort();
  }, [autoFill, setValue, focus]);

  return (
    <Form
      isLoading={tagsLoading || isPrefilling}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon={{ source: Icon.Plus }} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Pinboard" url="https://pinboard.in" />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="Enter URL (Tip: Select a URL before opening this form)"
        {...itemProps.url}
      />
      <Form.TextField title="Title" placeholder="Enter title" {...itemProps.title} />
      <Form.Separator />
      <Form.TagPicker title="Tags" placeholder="Select tags..." {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.name} value={tag.name} title={`${tag.name} (${tag.count})`} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox title="" label="Private" storeValue {...itemProps.private} />
      <Form.Checkbox title="" label="Read Later" storeValue {...itemProps.readLater} />
    </Form>
  );
}

function extractDocumentTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return decodeHtmlEntities(match[1].trim());
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
