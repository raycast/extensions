import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FC } from "react";
import { updateLevel } from "../storage";
import { Task } from "../types";
import { DifficultyIconMap } from "../constants";

type ChangeLevelProps = {
  item: Task;
  refetchList: () => void;
};
export const ChangeLevel: FC<ChangeLevelProps> = ({ item: item, refetchList }) => {
  const { pop } = useNavigation();

  const handleSubmit = async ({ difficulty }: { difficulty: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating level of task",
      message: item.text,
    });
    try {
      await updateLevel(item.id, difficulty);
      toast.style = Toast.Style.Success;
      toast.title = "Updated level of task";
      refetchList();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update level of task";
      if (e instanceof Error) {
        toast.message = e.message;
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Level" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="difficulty" title="Level" defaultValue={item.difficulty}>
        <Form.Dropdown.Item value="Trivial" title="Trivial" icon={DifficultyIconMap.Trivial} />
        <Form.Dropdown.Item value="Medium" title="Medium" icon={DifficultyIconMap.Medium} />
        <Form.Dropdown.Item value="Hard" title="Hard" icon={DifficultyIconMap.Hard} />
      </Form.Dropdown>
    </Form>
  );
};
