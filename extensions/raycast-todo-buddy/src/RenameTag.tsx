import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FC } from "react";
import { renameTag } from "./storage";
import { Tag } from "./types";

type RenameTagProps = {
  tag: Tag;
  revalidate: () => void;
};
export const RenameTag: FC<RenameTagProps> = ({ tag, revalidate }) => {
  const { pop } = useNavigation();

  const handleSubmit = async ({ newName }: { newName: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming a tag",
      message: newName,
    });
    try {
      await renameTag(tag.id, newName);
      toast.style = Toast.Style.Success;
      toast.title = "Renamed a tag";
      revalidate();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename a tag";
      if (e instanceof Error) {
        toast.message = e.message;
      }
      throw e;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField defaultValue={tag.name} id="newName" title="Tag Name" />
    </Form>
  );
};
