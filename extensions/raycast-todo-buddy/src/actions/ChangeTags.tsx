import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { FC } from "react";
import { getAllTags, updateTags } from "../storage";
import { Task } from "../types";

type ChangeTagsProps = {
  item: Task;
  refetchList: () => void;
};
export const ChangeTags: FC<ChangeTagsProps> = ({ item: item, refetchList }) => {
  const { pop } = useNavigation();
  const { isLoading, data: tags } = useCachedPromise(getAllTags, [], {
    initialData: [],
  });

  const handleSubmit = async ({ tags }: { tags: string[] }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating tags of task",
      message: item.text,
    });
    try {
      await updateTags(item.id, tags);
      toast.style = Toast.Style.Success;
      toast.title = "Updated tags of task";
      refetchList();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update tags of task";
      if (e instanceof Error) {
        toast.message = e.message;
      }
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Tags" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="tags" title="Tags" defaultValue={item.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
};
