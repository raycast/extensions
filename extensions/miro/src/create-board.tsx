import { Action, ActionPanel, Form, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import * as miro from "./oauth/miro";
import { FormValidation, useForm } from "@raycast/utils";

interface CreateBoardProps {
  name: string;
  description: string;
}

const placeholders = ["Flowchart", "Quick Retrospective", "Brainwriting", "Product Roadmap"];
const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

export default function CreateBoard() {
  const { itemProps, handleSubmit } = useForm<CreateBoardProps>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating board..." });
      try {
        await miro.createItem(values.name, values.description);
        toast.title = "🎉 Board created!";
        toast.style = Toast.Style.Success;
        await launchCommand({ name: "list-boards", type: LaunchType.UserInitiated });
      } catch (err) {
        console.error(err);
        toast.title = "Could not create the board.";
        toast.message = String(err);
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Board" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Board Name" placeholder={placeholder} {...itemProps.name} />
      <Form.TextArea id="description" title="Board Description" placeholder="Description..." />
    </Form>
  );
}
