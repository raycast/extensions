import { Action, ActionPanel, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import { addItemFromURL } from "./utils/api";
import { useFolderList } from "./utils/query";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { Folder } from "./@types/eagle";

export default function AddFromURL() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [folderId, setFolderId] = useState("");
  const { data: folders = [], error } = useFolderList();

  checkEagleInstallation();

  if (error && "code" in error && error.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  }

  const handleSubmit = async () => {
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL is required",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding item...",
      });

      await addItemFromURL({
        url,
        name: name || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
        annotation: annotation || undefined,
        folderId: folderId || undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Item added",
        message: name || url,
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Flatten folder tree for dropdown
  const flattenFolders = (folders: Folder[], prefix = ""): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    for (const folder of folders) {
      const displayName = prefix ? `${prefix} / ${folder.name}` : folder.name;
      result.push({ id: folder.id, name: displayName });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, displayName));
      }
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Eagle" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/image.jpg"
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.TextField
        id="name"
        title="Name (Optional)"
        placeholder="Custom name for the item"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="tags"
        title="Tags (Optional)"
        placeholder="tag1, tag2, tag3"
        value={tags}
        onChange={setTags}
        info="Comma-separated list of tags"
      />
      <Form.TextArea
        id="annotation"
        title="Annotation (Optional)"
        placeholder="Add notes or description"
        value={annotation}
        onChange={setAnnotation}
      />
      <Form.Dropdown id="folder" title="Folder (Optional)" value={folderId} onChange={setFolderId}>
        <Form.Dropdown.Item value="" title="No Folder (Root)" />
        {flatFolders.map((folder) => (
          <Form.Dropdown.Item key={folder.id} value={folder.id} title={folder.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
