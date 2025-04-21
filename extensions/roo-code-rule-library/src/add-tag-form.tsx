import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addTagToStorage, updateTagInStorage } from "./tag-storage";
import { showSuccessToast } from "./utils/utils";
import { Tag } from "./types";

interface AddTagFormProps {
  tag?: Tag;
  onTagSaved: (tag: Tag | undefined) => void;
}

export default function AddTagForm({ tag, onTagSaved }: AddTagFormProps) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState(tag ? tag.name : "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveTag = async () => {
    if (tagName.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "Tag name cannot be empty",
      });
      return;
    }

    setIsLoading(true);
    try {
      let savedTag: Tag | undefined;
      if (tag) {
        savedTag = await updateTagInStorage(tag.name, { ...tag, name: tagName.trim() });
        if (savedTag) {
          showSuccessToast("Tag updated", `Tag "${savedTag.name}" updated successfully.`);
        }
      } else {
        savedTag = await addTagToStorage(tagName.trim());
        if (savedTag) {
          showSuccessToast("Tag added", `Tag "${savedTag.name}" added successfully.`);
        }
      }
      onTagSaved(savedTag);
      pop();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitButtonTitle = tag ? "Save Tag" : "Add Tag";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitButtonTitle} onSubmit={handleSaveTag} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tagName"
        title="Tag Name"
        placeholder="Enter tag name"
        value={tagName}
        onChange={setTagName}
      />
    </Form>
  );
}
