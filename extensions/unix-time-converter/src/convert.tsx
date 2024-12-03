import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";

import moment from "moment";
import { useState } from "react";

enum InputType {
  JS_TIMESTAMP = "Number of milliseconds since the epoch (JavaScript timestamps)",
  UNIX_TIMESTAMP = "Number of seconds since the epoch (UNIX timestamps)",
  HUMAN_DATE = "A human readable date string",
  UNKNOWN = "Could not detect a date or time from the input 😭",
}

export default function Command() {
  const [inputType, setInputType] = useState<InputType>(InputType.JS_TIMESTAMP);
  const [unixTime, setUnixTime] = useState<number>();
  const [humanDate, setHumanDate] = useState<string>();
  const [relativeTime, setRelativeTime] = useState<string>();

  const isNumeric = (str: string): boolean => {
    // Do not allow slashes since they can be used for human date inputs
    return /^\s*\d+(\.\d+)?\s*$/.test(str);
  };

  const setDate = (inputType: InputType, date?: Date) => {
    setInputType(inputType);
    if (date) {
      setUnixTime(date.getTime() / 1000);
      setHumanDate(date.toString());
      setRelativeTime(moment(date.getTime()).fromNow());
    } else {
      setUnixTime(0);
      setHumanDate("");
      setRelativeTime("");
    }
  };

  const handleChange = (textInput: string) => {
    if (isNumeric(textInput)) {
      const numberTime = parseFloat(textInput);
      if (numberTime > 10_000_000_000) {
        // Assume this is a time in milliseconds
        setDate(InputType.JS_TIMESTAMP, new Date(numberTime));
      } else {
        // Assume this is a time in seconds
        setDate(InputType.UNIX_TIMESTAMP, new Date(numberTime * 1000));
      }
    } else {
      const parsedDate = new Date(textInput);
      if (isNaN(parsedDate.getTime())) {
        setDate(InputType.UNKNOWN);
      } else {
        setDate(InputType.HUMAN_DATE, parsedDate);
      }
    }
  };

  const handleSubmit = async () => {
    switch (inputType) {
      case InputType.JS_TIMESTAMP:
      case InputType.UNIX_TIMESTAMP:
        await Clipboard.copy(humanDate || "");
        showToast({ style: Toast.Style.Success, title: "Copied human readable date to clipboard" });
        break;
      case InputType.HUMAN_DATE:
        showToast({ style: Toast.Style.Success, title: "Copied unix time to clipboard" });
        await Clipboard.copy(unixTime || "");
        break;
      case InputType.UNKNOWN:
        showToast({ style: Toast.Style.Failure, title: "Unable to parse date" });
        break;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter an epoch time (sec or ms) or human date" />
      <Form.TextField
        id="textInput"
        title="Enter text"
        defaultValue={Date.now().toString()}
        onChange={handleChange}
        autoFocus
        storeValue
      />
      <Form.Separator />
      <Form.Description title="Detected input" text={`${inputType}`} />
      <Form.Description title="Unix time" text={`${unixTime}`} />
      <Form.Description title="Human time" text={`${humanDate}`} />
      <Form.Description title="Relative time" text={`${relativeTime}`} />
    </Form>
  );
}
