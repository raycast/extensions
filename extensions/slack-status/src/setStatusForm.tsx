import { ActionPanel, Form, FormValues, showToast, SubmitFormAction, ToastStyle, useNavigation } from "@raycast/api";
import { slackEmojiCodeMap } from "./emojiCodes";
import { SlackStatusResponseState } from "./interfaces";
import { SlackClient } from "./slackClient";

export default function CustomStatusForm(props: {
  slackClient: SlackClient;
  currentStatusResponseState: SlackStatusResponseState;
}) {
  const { pop } = useNavigation();
  function handleSubmit(values: FormValues) {
    console.log(values);
    if (!values.statusText) {
      showToast(ToastStyle.Failure, "Please set status text");
      return;
    }
    props.slackClient.setStatusFromPreset(
      {
        title: values.statusText,
        emojiCode: values.emoji,
        defaultDuration: 0,
      },
      props.currentStatusResponseState,
      parseInt(values.clearAfter),
      (success) => {
        if (success) {
          pop();
        }
      }
    );
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Set Status" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="emoji" title="Emoji" defaultValue=":speech_balloon:" storeValue>
        {Object.keys(slackEmojiCodeMap).map((emojiCode: string) => {
          const emoji = slackEmojiCodeMap[emojiCode];
          return <Form.Dropdown.Item key={emojiCode} title={`${emoji}  ${emojiCode}`} value={emojiCode} />;
        })}
      </Form.Dropdown>
      <Form.TextField id="statusText" title="Status" placeholder="What's your status?" />
      <Form.Dropdown id="clearAfter" title="Clear After" storeValue>
        <Form.Dropdown.Item key={"0m"} title="Don't clear" value="0" />
        <Form.Dropdown.Item key={"30m"} title="30 minutes" value="30" />
        <Form.Dropdown.Item key={"45m"} title="45 minutes" value="45" />
        <Form.Dropdown.Item key={"60m"} title="1 hour" value="60" />
        <Form.Dropdown.Item key={"90m"} title="1.5 hour" value="90" />
        <Form.Dropdown.Item key={"120m"} title="2 hours" value="120" />
        <Form.Dropdown.Item key={"180m"} title="3 hours" value="180" />
      </Form.Dropdown>
    </Form>
  );
}
