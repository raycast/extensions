import { Form, ActionPanel, useNavigation, Action, showToast, Toast } from "@raycast/api";
import { isValidStatus, Status } from "../../gitlabapi";
import { showFailureToast } from "@raycast/utils";
import {
  clearDurations,
  clearDurationText,
  emojiSymbol,
  getAllEmojiSymbolAliases,
  getClearDurationDate,
} from "./utils";
import { gitlab } from "../../common";

export function StatusForm(props: {
  submitTitle: string;
  onSubmit: (values: Form.Values) => Promise<void>;
  existingStatus?: Status | undefined;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.submitTitle} onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <StatusEmojiDropDown id="emoji" title="Emoji" defaultValue={props.existingStatus?.emoji} />
      <Form.TextField id="message" title="Message" defaultValue={props.existingStatus?.message} />
      <StatusDurationDropDown id="clear_status_after" defaultValue={props.existingStatus?.clear_status_after || ""} />
    </Form>
  );
}

function StatusDurationDropDown(props: { id: string; defaultValue: string | undefined }) {
  return (
    <Form.Dropdown id={props.id} title="Duration" defaultValue={props.defaultValue}>
      {Object.keys(clearDurations).map((durationKey) => (
        <Form.Dropdown.Item key={durationKey + "_"} title={clearDurationText(durationKey)} value={durationKey} />
      ))}
    </Form.Dropdown>
  );
}

function StatusEmojiDropDown(props: { id: string; title: string; defaultValue?: string | undefined }) {
  return (
    <Form.Dropdown id={props.id} title={props.title} defaultValue={props.defaultValue}>
      <Form.Dropdown.Item key="-" title="-" value="" />
      {getAllEmojiSymbolAliases().map((alias) => (
        <Form.Dropdown.Item key={alias} title={`:${alias}:`} value={alias} icon={emojiSymbol(alias)} />
      ))}
    </Form.Dropdown>
  );
}

export function StatusFormSet(props: { setCurrentStatus?: React.Dispatch<React.SetStateAction<Status | undefined>> }) {
  const { pop } = useNavigation();
  const handle = async (values: Form.Values) => {
    try {
      const status = getValidStatusFromFormValue(values);
      await showToast({ style: Toast.Style.Animated, title: "Setting Status..." });
      await gitlab.setUserStatus(status);
      showToast(Toast.Style.Success, "Status set");
      if (props.setCurrentStatus) {
        props.setCurrentStatus(status);
      }
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Could not set Status" });
    }
  };
  return <StatusForm onSubmit={handle} submitTitle="Set Status" />;
}

function getValidStatusFromFormValue(values: Form.Values): Status {
  const status: Status = {
    emoji: values.emoji,
    message: values.message,
    clear_status_after: values.clear_status_after,
    clear_status_at: getClearDurationDate(values.clear_status_after),
  };
  if (!isValidStatus(status)) {
    throw Error("Invalid Status");
  }
  return status;
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
      showFailureToast(error, { title: "Could not create Preset" });
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
      showFailureToast(error, { title: "Could not edit Preset" });
    }
  };
  return <StatusForm onSubmit={handle} submitTitle="Edit Preset" existingStatus={props.status} />;
}
