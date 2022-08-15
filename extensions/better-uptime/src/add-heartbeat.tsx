import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { useRef, useState } from "react";
import { requiredErrorText } from "./constants";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  const nameRef = useRef<Form.TextField>(null);
  const periodRef = useRef<Form.TextField>(null);
  const graceRef = useRef<Form.TextField>(null);

  const [nameError, setNameError] = useState<string | undefined>();
  const [periodError, setPeriodError] = useState<string | undefined>();
  const [graceError, setGraceError] = useState<string | undefined>();

  async function handleSubmit(item: any) {
    if (item.name === "") {
      setNameError(requiredErrorText);
      return false;
    }

    if (item.period === "") {
      setPeriodError(requiredErrorText);
      return false;
    }

    if (item.grace === "") {
      setGraceError(requiredErrorText);
      return false;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating heartbeat...",
    });

    await axios
      .post("https://betteruptime.com/api/v2/heartbeats", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Heartbeat created successfully";

        popToRoot();
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to create heartbeat";
        toast.message = error.response.data.errors;
      });
  }

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPeriodErrorIfNeeded() {
    if (periodError && periodError.length > 0) {
      setPeriodError(undefined);
    }
  }

  function dropGraceErrorIfNeeded() {
    if (graceError && graceError.length > 0) {
      setGraceError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Heartbeat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Daily database backup"
        ref={nameRef}
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError(requiredErrorText);
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="period"
        title="Period in seconds"
        defaultValue="10800"
        ref={periodRef}
        error={periodError}
        onChange={dropPeriodErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPeriodError(requiredErrorText);
          } else {
            dropPeriodErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="grace"
        title="Grace in seconds"
        defaultValue="300"
        ref={graceRef}
        error={graceError}
        onChange={dropGraceErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setGraceError(requiredErrorText);
          } else {
            dropGraceErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
