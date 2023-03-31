import { ActionPanel, Form, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { slackEmojiCodeMap } from "./emojiCodes";
import { SlackStatusPreset, SlackStatusResponseState } from "./interfaces";
import { SlackClient } from "./slackClient";

enum StatusFormMode {
  SetCustomStatus,
  CreatePreset,
  EditPreset,
}

export function SetCustomStatusForm(props: {
  slackClient: SlackClient;
  currentStatusResponseState: SlackStatusResponseState;
  initialValues?: SlackStatusPreset;
}) {
  const { pop } = useNavigation();
  function handleSubmit(values: Form.Values) {
    console.log(values);
    if (!validateForm(values)) {
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
  return <StatusForm mode={StatusFormMode.SetCustomStatus} preset={props.initialValues} onSubmit={handleSubmit} />;
}

export function CreateStatusPresetForm(props: { onCompletion: (preset: SlackStatusPreset) => void }) {
  function handleSubmit(values: Form.Values) {
    if (!validateForm(values)) {
      return;
    }
    props.onCompletion({
      title: values.statusText,
      emojiCode: values.emoji,
      defaultDuration: parseInt(values.clearAfter),
    });
  }

  return <StatusForm mode={StatusFormMode.CreatePreset} onSubmit={handleSubmit} />;
}

export function EditStatusPresetForm(props: {
  preset: SlackStatusPreset;
  onCompletion: (preset: SlackStatusPreset) => void;
}) {
  function handleSubmit(values: Form.Values) {
    if (!validateForm(values)) {
      return;
    }
    props.onCompletion({
      title: values.statusText,
      emojiCode: values.emoji,
      defaultDuration: parseInt(values.clearAfter),
    });
  }

  return <StatusForm mode={StatusFormMode.EditPreset} onSubmit={handleSubmit} preset={props.preset} />;
}

function StatusForm(props: {
  mode: StatusFormMode;
  onSubmit: (values: Form.Values) => void;
  preset?: SlackStatusPreset;
}) {
  let submitActionTitle = "";
  let navigationTitle = "";
  switch (props.mode) {
    case StatusFormMode.SetCustomStatus:
      submitActionTitle = "Set Status";
      navigationTitle = "Set Custom Status";
      break;
    case StatusFormMode.EditPreset:
      submitActionTitle = "Update Preset";
      navigationTitle = "Edit Preset";
      break;
    case StatusFormMode.CreatePreset:
      submitActionTitle = "Create Preset";
      navigationTitle = "Create Preset";
  }
  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitActionTitle} onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="emoji"
        title="Emoji"
        defaultValue={props.preset?.emojiCode || ":speech_balloon:"}
        storeValue={props.preset ? false : true}
      >
        {Object.keys(slackEmojiCodeMap).map((emojiCode: string) => {
          const emoji = slackEmojiCodeMap[emojiCode];
          return <Form.Dropdown.Item key={emojiCode} title={`${emoji}  ${emojiCode}`} value={emojiCode} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="statusText"
        title="Status"
        placeholder="What's your status?"
        defaultValue={props.preset?.title}
      />
      <Form.Dropdown
        id={"clearAfter"}
        title={props.mode == StatusFormMode.SetCustomStatus ? "Clear After" : "Duration"}
        defaultValue={props.preset?.defaultDuration?.toString()}
        storeValue={props.preset ? false : true}
      >
        <Form.Dropdown.Item key={"0m"} title="Don't clear" value="0" />
        <Form.Dropdown.Item key={"15m"} title="15 minutes" value="15" />
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

function validateForm(values: Form.Values): boolean {
  if (!values.statusText) {
    showToast({
      style: Toast.Style.Failure,
      title: "Please set status text",
    });
    return false;
  }
  return true;
}
