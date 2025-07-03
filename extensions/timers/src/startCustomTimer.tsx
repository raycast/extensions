import { Action, ActionPanel, Form, getPreferenceValues, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { soundData } from "./backend/soundData";
import { checkForOverlyLoudAlert, createCustomTimer, ensureCTFileExists, startTimer } from "./backend/timerBackend";
import { CTInlineArgs, InputField, Preferences, RayFormEvent, Values } from "./backend/types";

export default function CustomTimerView(props: { arguments: CTInlineArgs }) {
  const hasArgs = Object.values(props.arguments).some((x) => x !== "");
  const [hourErr, setHourErr] = useState<string | undefined>();
  const [minErr, setMinErr] = useState<string | undefined>();
  const [secErr, setSecErr] = useState<string | undefined>();
  const { pop } = useNavigation();

  const prefs: Preferences = getPreferenceValues();

  if (hasArgs && prefs.customTimerFormBypass) {
    const [hours, minutes, seconds] = (["hours", "minutes", "seconds"] as const)
      .map((k) => props.arguments[k])
      .map(Number)
      .map((n) => (Number.isNaN(n) ? 0 : n));

    startTimer({ timeInSeconds: 3600 * hours + 60 * minutes + seconds });

    return null;
  }

  const handleSubmit = (values: Values) => {
    ensureCTFileExists();
    if (values.hours === "" && values.minutes === "" && values.seconds === "") {
      const toast = new Toast({ style: Toast.Style.Failure, title: "No values set for timer length!" });
      toast.show();
    } else if (isNaN(Number(values.hours))) {
      setHourErr("Hours must be a number!");
    } else if (isNaN(Number(values.minutes))) {
      setMinErr("Minutes must be a number!");
    } else if (isNaN(Number(values.seconds))) {
      setSecErr("Seconds must be a number!");
    } else {
      if (!checkForOverlyLoudAlert()) return;
      const timerName = values.name ? values.name : "Untitled";
      const timeInSeconds = 3600 * Number(values.hours) + 60 * Number(values.minutes) + Number(values.seconds);
      startTimer({
        timeInSeconds: timeInSeconds,
        timerName: timerName,
        selectedSound: values.selectedSound,
      }).then(() => pop());
      if (values.willBeSaved)
        createCustomTimer({
          name: values.name,
          timeInSeconds: timeInSeconds,
          selectedSound: values.selectedSound,
          showInMenuBar: true,
        });
    }
  };

  const dropHourErrorIfNeeded = () => {
    if (hourErr && hourErr.length > 0) {
      setHourErr(undefined);
    }
  };

  const dropMinErrorIfNeeded = () => {
    if (minErr && minErr.length > 0) {
      setMinErr(undefined);
    }
  };

  const dropSecErrorIfNeeded = () => {
    if (secErr && secErr.length > 0) {
      setSecErr(undefined);
    }
  };

  const hourValidator = (event: RayFormEvent) => {
    const input = event.target.value;
    if (isNaN(Number(input))) {
      setHourErr("Hours must be a number!");
    } else {
      dropHourErrorIfNeeded();
    }
  };

  const minValidator = (event: RayFormEvent) => {
    const input = event.target.value;
    if (isNaN(Number(input))) {
      setMinErr("Minutes must be a number!");
    } else {
      dropMinErrorIfNeeded();
    }
  };

  const secValidator = (event: RayFormEvent) => {
    const input = event.target.value;
    if (isNaN(Number(input))) {
      setSecErr("Seconds must be a number!");
    } else {
      dropSecErrorIfNeeded();
    }
  };

  const inputFields: InputField[] = [
    {
      id: "hours",
      title: "Hours",
      placeholder: "0",
      err: hourErr,
      drop: dropHourErrorIfNeeded,
      validator: hourValidator,
    },
    {
      id: "minutes",
      title: "Minutes",
      placeholder: "00",
      err: minErr,
      drop: dropMinErrorIfNeeded,
      validator: minValidator,
    },
    {
      id: "seconds",
      title: "Seconds",
      placeholder: "00",
      err: secErr,
      drop: dropSecErrorIfNeeded,
      validator: secValidator,
    },
  ];
  const sortOrder = prefs.newTimerInputOrder;
  sortOrder !== "hhmmss" ? inputFields.reverse() : inputFields;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Custom Timer" onSubmit={(values: Values) => handleSubmit(values)} />
        </ActionPanel>
      }
    >
      {inputFields.map((item, index) => (
        <Form.TextField
          key={index}
          id={item.id}
          title={item.title}
          placeholder={item.placeholder}
          defaultValue={props.arguments[item.id]}
          error={item.err}
          onChange={item.drop}
          onBlur={item.validator}
        />
      ))}
      <Form.Dropdown id="selectedSound" defaultValue="default" title="Sound">
        <Form.Dropdown.Item value="default" title="Default" />
        {soundData.map((item, index) => (
          <Form.Dropdown.Item
            key={index}
            title={item.value === prefs.selectedSound ? `${item.title} (currently selected)` : item.title}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Name" placeholder="Pour Tea" autoFocus={hasArgs} />
      <Form.Checkbox id="willBeSaved" label="Save as preset" />
    </Form>
  );
}
