import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { durationTitleMap } from "./durations";
import { slackEmojiCodeMap } from "./emojis";
import { FormValues } from "./types";

export function StatusForm(props: {
  navigationTitle?: string;
  actionTitle?: string;
  initalValues?: FormValues;
  onSubmit: (values: FormValues) => void;
}) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: props.initalValues,
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
      <Form.Dropdown title="Emoji" storeValue={props.initalValues?.emoji === undefined} {...itemProps.emoji}>
        {Object.entries(slackEmojiCodeMap).map(([emojiCode, emoji]) => (
          <Form.Dropdown.Item key={emojiCode} title={`${emoji}  ${emojiCode}`} value={emojiCode} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Status" placeholder="What's your status?" {...itemProps.statusText} />
      <Form.Dropdown title="Duration" storeValue={props.initalValues?.emoji === undefined} {...itemProps.duration}>
        {Object.entries(durationTitleMap).map(([duration, title]) => (
          <Form.Dropdown.Item key={duration} title={title} value={duration.toString()} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
