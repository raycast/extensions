import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { useRef, useState } from "react";
import { requiredErrorText } from "./constants";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  const summaryRef = useRef<Form.TextField>(null);
  const descriptionRef = useRef<Form.TextField>(null);
  const requesterEmailRef = useRef<Form.TextField>(null);

  const [summaryError, setSummaryError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [requesterEmailError, setRequesterEmailError] = useState<string | undefined>();

  async function handleSubmit(item: any) {
    if (item.summary === "") {
      setSummaryError(requiredErrorText);
      return false;
    }

    if (item.description === "") {
      setDescriptionError(requiredErrorText);
      return false;
    }

    if (item.requester_email === "") {
      setRequesterEmailError(requiredErrorText);
      return false;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating incident...",
    });

    await axios
      .post("https://betteruptime.com/api/v2/incidents", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Incident created successfully";

        popToRoot();
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to create incident";
        toast.message = error.response.data.errors;
      });
  }

  function dropSummaryErrorIfNeeded() {
    if (summaryError && summaryError.length > 0) {
      setSummaryError(undefined);
    }
  }

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  function dropRequesterEmailErrorIfNeeded() {
    if (requesterEmailError && requesterEmailError.length > 0) {
      setRequesterEmailError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Incident" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="summary"
        title="Summary"
        placeholder="New users can't sign up"
        ref={summaryRef}
        error={summaryError}
        onChange={dropSummaryErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setSummaryError(requiredErrorText);
          } else {
            dropSummaryErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter a description"
        ref={descriptionRef}
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescriptionError(requiredErrorText);
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="requester_email"
        title="Requester Email"
        placeholder="john@example.com"
        ref={requesterEmailRef}
        error={requesterEmailError}
        onChange={dropRequesterEmailErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setRequesterEmailError(requiredErrorText);
          } else {
            dropRequesterEmailErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
