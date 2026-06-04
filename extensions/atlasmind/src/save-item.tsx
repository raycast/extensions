import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LaunchProps,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { saveItem, updateItem } from "./db";
import { fetchOg } from "./fetch-og";

type ItemType = "url" | "text" | "note";

function isUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export default function Command(
  props: LaunchProps<{ arguments: { url?: string; title?: string } }>,
) {
  const argUrl = props.arguments?.url?.trim() ?? "";
  const argTitle = props.arguments?.title?.trim() ?? "";

  const [content, setContent] = useState(argUrl);
  const [title, setTitle] = useState(argTitle);
  const [tags, setTags] = useState("");
  const [type, setType] = useState<ItemType>(
    argUrl && isUrl(argUrl) ? "url" : "text",
  );

  useEffect(() => {
    if (argUrl) return;
    Clipboard.readText().then((text) => {
      if (text) {
        setContent(text);
        setType(isUrl(text) ? "url" : "text");
      }
    });
  }, []);

  async function handleSubmit() {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }
    const item = await saveItem({
      type,
      content: content.trim(),
      title: title.trim(),
      tags: tags.trim(),
    });
    if (item.type === "url") {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching preview…",
      });
      const {
        image,
        title: ogt,
        description,
        bodyExcerpt,
      } = await fetchOg(item.content);
      if (image || ogt || description || bodyExcerpt)
        await updateItem(item.id, {
          og_image: image,
          og_title: ogt,
          og_description: description,
          body_excerpt: bodyExcerpt,
        });
      toast.style = Toast.Style.Success;
      toast.title = image ? "Saved with preview" : "Saved (no preview found)";
    } else {
      await showToast({ style: Toast.Style.Success, title: "Saved!" });
    }
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        value={type}
        onChange={(v) => setType(v as ItemType)}
      >
        <Form.Dropdown.Item value="url" title="URL" />
        <Form.Dropdown.Item value="text" title="Text" />
        <Form.Dropdown.Item value="note" title="Note" />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        onChange={setContent}
        placeholder="URL, text snippet, or note…"
      />
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
        placeholder="Optional title"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        value={tags}
        onChange={setTags}
        placeholder="work, design, ux (comma-separated)"
      />
    </Form>
  );
}
