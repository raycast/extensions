import {
  Form,
  Action,
  ActionPanel,
  useNavigation,
  showToast,
  Toast,
  Color,
  Icon,
} from "@raycast/api";
import { BookmarkItem } from "../types";
import { useState } from "react";

interface RenameBookmarkFormProps {
  bookmark: BookmarkItem;
  onRename: (id: string, newTitle: string) => void;
}

export function RenameBookmarkForm({
  bookmark,
  onRename,
}: RenameBookmarkFormProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(bookmark.title);

  const handleSubmit = () => {
    if (!title.trim()) {
      showToast(Toast.Style.Failure, "Title cannot be empty");
      return;
    }
    onRename(bookmark.id, title.trim());
    showToast(Toast.Style.Success, "Renamed");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="New Name"
        value={title}
        onChange={setTitle}
        autoFocus
      />
    </Form>
  );
}
