import { Icon, Color, Action, Form, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";
import { getErrorMessage } from "../utils";

function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function InputDateTimeForm(props: { state: State; hasDate: boolean; hasTime: boolean }): JSX.Element {
  const s = props.state;
  const hasDate = props.hasDate;
  const hasTime = props.hasTime;
  const current = unixTimestampToDate(s.attributes.timestamp);
  console.log(current);
  const { pop } = useNavigation();
  const handle = async (input: Form.Values) => {
    try {
      const text: string = input.text;
      const min: number | undefined = s.attributes.min;
      const max: number | undefined = s.attributes.max;
      if (min !== undefined) {
        if (text.length < min) {
          throw Error(`Minimum text length is ${min}`);
        }
      }
      if (max !== undefined) {
        if (text.length > max) {
          throw Error(`Maximum text length is ${max}`);
        }
      }
      const unixTimestamp = dateToUnixTimestamp(input.datetime);
      await ha.callService("input_datetime", "set_datetime", { entity_id: s.entity_id, timestamp: unixTimestamp });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };
  let mode = Form.DatePicker.Type.DateTime;
  let title = "Date and Time";
  if (hasDate && hasTime) {
    title = "Date and Time";
    mode = Form.DatePicker.Type.DateTime;
  } else if (hasDate) {
    title = "Date";
    mode = Form.DatePicker.Type.Date;
  } else if (hasTime) {
    title = "Time";
    mode = Form.DatePicker.Type.DateTime; // FIXME no time only in raycast 1.31 right now
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handle} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="datetime" type={mode} title={title} />
    </Form>
  );
}

export function InputDateTimeSetValueAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_datetime")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const hasDate: boolean = s.attributes.has_date || false;
  const hasTime: boolean = s.attributes.has_time || false;
  let title = "";
  if (hasDate && hasTime) {
    title = "Set Date and Time";
  } else if (hasDate) {
    title = "Set Date";
  } else if (hasTime) {
    title = "Set Time";
  } else {
    return null;
  }
  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputDateTimeForm state={s} hasDate={hasDate} hasTime={hasTime} />}
    />
  );
}
