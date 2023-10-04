import { Deadline } from "./types";
import { useNavigation, Form, Action, ActionPanel, Icon } from "@raycast/api";

export function CreateDeadlineForm(props: { onCreate: (deadline: Deadline) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: {
    title: string;
    shortTitle: string;
    startDate: Date;
    endDate: Date;
    isPinned: boolean;
    isFav: boolean;
  }) {
    const newDeadline = {
      title: values.title,
      shortTitle: values.shortTitle,
      startDate: values.startDate,
      endDate: values.endDate,
      isPinned: values.isPinned,
      isFav: values.isFav,
    };

    props.onCreate(newDeadline);

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Deadline" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
      <Form.TextField id="shortTitle" title="Short Title" />
      <Form.DatePicker id="startDate" title="Start Date" />
      <Form.DatePicker id="endDate" title="End Date" />
      <Form.Checkbox id="isPinned" label="Pin" />
      <Form.Checkbox id="isFav" label="Show inline in Raycast" />
    </Form>
  );
}
