import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getErrorMessage } from "@lib/utils";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import React from "react";
import { dateToUnixTimestamp, unixTimestampToDate } from "./utils";

export function InputDateTimeForm(props: { state: State; hasDate: boolean; hasTime: boolean }): React.ReactElement {
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
