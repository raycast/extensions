import { Activity } from "./types";
import { ActionPanel, Form, showToast, SubmitFormAction, ToastStyle, useNavigation } from "@raycast/api";
import { useState } from "react";

type EditNoteParams = {
  spaceId: string;
  activityId: string;
  text: string;
  startedAt: string;
};

type Params = {
  note: string;
  activities: Activity[];
  activity: Activity;
  startedAt: string;
  onSubmit: (params: EditNoteParams) => Promise<unknown>;
};

export const ComponentEditNote = ({ note, startedAt, activities, activity, onSubmit }: Params) => {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const submit = (values: EditNoteParams) =>
    Promise.resolve()
      .then(() => setIsLoading(true))
      .then(() => onSubmit({ ...values, spaceId: activity.spaceId }))
      .then(pop)
      .catch(e => {
        showToast(ToastStyle.Failure, e.message);
        setIsLoading(false);
      });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Note" defaultValue={note} />
      <Form.Dropdown id="activityId" defaultValue={activity?.id}>
        {activities.map(activity => (
          <Form.Dropdown.Item key={activity.id} value={activity.id} title={activity.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="startedAt" defaultValue={startedAt} />
    </Form>
  );
};
