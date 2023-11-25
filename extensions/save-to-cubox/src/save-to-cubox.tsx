import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

type Values = {
  type: string;
  content: string;
  title: string;
  description: string;
  tags: string;
  folder: string;
};

interface Preferences {
  api: string;
}

const contentInfoMap: Record<string, string> = {
  url: "Complete url, including protocol like http:// or https://",
  memo: "Pure text, less than 3000 characters",
};

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [type, setType] = useState("url");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState("");

  async function handleSubmit(values: Values) {
    const { type, content, title, description, tags, folder } = values;

    let tagList: string[] = [];

    try {
      tagList = tags.split(" ");
    } catch (error) {
      showToast({ title: "Save to Cubox", message: "Tags is not valid", style: Toast.Style.Failure });
      return;
    }

    if (type === "url" && !content.startsWith("http")) {
      showToast({ title: "Save to Cubox", message: "Url is not valid", style: Toast.Style.Failure });
      return;
    }

    if (content !== "") {
      const response = await axios.post(preferences.api, {
        type: type,
        content: content,
        title: title,
        description: description,
        tags: tagList,
        folder: folder,
      });

      if (response.data.code === 200) {
        showToast({ title: "Save to Cubox", message: "Success" });
        setContent("");
        setTitle("");
        setDescription("");
        setTags("");
        setFolder("");
      } else {
        showToast({ title: "Save to Cubox", message: response.data.message || "Unknown error" });
      }
    } else {
      showToast({ title: "Save to Cubox", message: "Content is empty" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Save to Cubox"
    >
      <Form.Dropdown id="type" title="Type" defaultValue={type} storeValue onChange={setType}>
        <Form.Dropdown.Item value="url" title="url" />
        <Form.Dropdown.Item value="memo" title="memo" />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        placeholder={`Enter ${type}`}
        value={content}
        onChange={setContent}
        info={contentInfoMap[type]}
      />
      <Form.Separator />
      <Form.TextField id="title" title="Card Title" placeholder="Optional" value={title} onChange={setTitle} />
      <Form.TextArea
        id="description"
        title="Card Description"
        placeholder="Optional"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Separated by space, optional"
        value={tags}
        onChange={setTags}
      />
      <Form.TextField id="folder" title="Folder" placeholder="Optional" value={folder} onChange={setFolder} />
    </Form>
  );
}
