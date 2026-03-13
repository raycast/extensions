import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { durationTitleMap } from "./durations";
import { slackEmojiCodeMap } from "./emojis";
import { FormValues } from "./types";

export function StatusForm(props: {
  navigationTitle?: string;
  actionTitle?: string;
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => void;
}) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: props.initialValues,
    validation: {
      statusText: FormValidation.Required,
    },
    onSubmit: props.onSubmit,
  });

  return (
    <Form
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.actionTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Emoji" storeValue={props.initialValues?.emoji === undefined} {...itemProps.emoji}>
        {Object.entries(slackEmojiCodeMap).map(([emojiCode, emoji]) => (
          <Form.Dropdown.Item key={emojiCode} title={`${emoji}  ${emojiCode}`} value={emojiCode} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Status" placeholder="What's your status?" {...itemProps.statusText} />
      <Form.Dropdown title="Duration" storeValue={props.initialValues?.emoji === undefined} {...itemProps.duration}>
        {Object.entries(durationTitleMap).map(([duration, title]) => (
          <Form.Dropdown.Item key={duration} title={title} value={duration.toString()} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        title="Notifications"
        label="Pause notifications"
        storeValue={props.initialValues?.pauseNotifications === undefined}
        {...itemProps.pauseNotifications}
      />
    </Form>
  );
}
