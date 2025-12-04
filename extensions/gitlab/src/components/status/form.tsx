import { Form, ActionPanel, useNavigation, Action } from "@raycast/api";
import { isValidStatus, Status } from "../../gitlabapi";
import {
  clearDurations,
  clearDurationText,
  emojiSymbol,
  getAllEmojiSymbolAliases,
  getClearDurationDate,
} from "./utils";
import { gitlab } from "../../common";
import { getErrorMessage, showErrorToast } from "../../utils";

export function StatusForm(props: {
  submitTitle: string;
  onSubmit: (values: Form.Values) => Promise<void>;
  existingStatus?: Status | undefined;
}) {
  const es = props.existingStatus;
  const emoji = es?.emoji;
  const message = es?.message;
  const duration = es?.clear_status_after || "";
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.submitTitle} onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <StatusEmojiDropDown id="emoji" title="Emoji" defaultValue={emoji} />
      <Form.TextField id="message" title="Message" defaultValue={message} />
      <StatusDurationDropDown id="clear_status_after" defaultValue={duration} />
    </Form>
  );
}

function StatusDurationDropDown(props: { id: string; defaultValue: string | undefined }) {
  return (
    <Form.Dropdown id={props.id} title="Duration" defaultValue={props.defaultValue}>
      {Object.keys(clearDurations).map((k) => (
        <Form.Dropdown.Item key={k + "_"} title={clearDurationText(k)} value={k} />
      ))}
    </Form.Dropdown>
  );
}

function StatusEmojiDropDown(props: { id: string; title: string; defaultValue?: string | undefined }) {
  return (
    <Form.Dropdown id={props.id} title={props.title} defaultValue={props.defaultValue}>
      <Form.Dropdown.Item key="-" title="-" value="" />
      {getAllEmojiSymbolAliases().map((k) => (
        <Form.Dropdown.Item key={k} title={`:${k}:`} value={k} icon={emojiSymbol(k)} />
      ))}
    </Form.Dropdown>
  );
}

export function StatusFormSet(props: { setCurrentStatus?: React.Dispatch<React.SetStateAction<Status | undefined>> }) {
  const { pop } = useNavigation();
  const handle = async (values: Form.Values) => {
    try {
      const status = getValidStatusFromFormValue(values);
      await gitlab.setUserStatus(status);
      if (props.setCurrentStatus) {
        props.setCurrentStatus(status);
      }
      pop();
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not set Status");
    }
  };
  return <StatusForm onSubmit={handle} submitTitle="Set Status" />;
}

function getValidStatusFromFormValue(values: Form.Values): Status {
  const s: Status = {
    emoji: values.emoji,
    message: values.message,
    clear_status_after: values.clear_status_after,
    clear_status_at: getClearDurationDate(values.clear_status_after),
  };
  if (!isValidStatus(s)) {
    throw Error("Invalid Status");
  }
  return s;
}

export function StatusFormPresetCreate(props: {
  presets: Status[] | undefined;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  onFinish: (status: Status) => Promise<void>;
}) {
  const handle = async (values: Form.Values) => {
    try {
      const status = getValidStatusFromFormValue(values);
      props.onFinish(status);
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not create Preset");
    }
  };
  return <StatusForm onSubmit={handle} submitTitle="Create Preset" />;
}

export function StatusFormPresetEdit(props: {
  status: Status;
  presets: Status[] | undefined;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  onFinish: (status: Status) => Promise<void>;
}) {
  const handle = async (values: Form.Values) => {
    try {
      const status = getValidStatusFromFormValue(values);
      await props.onFinish(status);
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not edit Preset");
    }
  };
  return <StatusForm onSubmit={handle} submitTitle="Edit Preset" existingStatus={props.status} />;
}
