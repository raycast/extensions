import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FC } from "react";
import { renameTask } from "../storage";
import { Task } from "../types";

type RenameTaskProps = {
  item: Task;
  refetchList: () => void;
};
export const RenameTask: FC<RenameTaskProps> = ({ item: item, refetchList }) => {
  const { pop } = useNavigation();

  const handleSubmit = async ({ newName }: { newName: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming a task",
      message: newName,
    });
    try {
      await renameTask(item.id, newName);
      toast.style = Toast.Style.Success;
      toast.title = "Renamed a task";
      refetchList();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename a task";
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
          <Action.SubmitForm title="Rename Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField defaultValue={item.text} id="newName" title="Task Name" />
    </Form>
  );
};
