import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import axios from "axios";
import { useRef, useState } from "react";
import { requiredErrorText } from "./constants";
import { Preferences } from "./interface";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();

  const urlRef = useRef<Form.TextField>(null);
  const checkFrequencyRef = useRef<Form.TextField>(null);
  const tcpTimeoutRef = useRef<Form.TextField>(null);

  const [urlError, setUrlError] = useState<string | undefined>();
  const [checkFrequencyError, setCheckFrequencyError] = useState<string | undefined>();
  const [tcpTimeoutError, setTcpTimeoutError] = useState<string | undefined>();
  const [monitorType, setMonitorType] = useState<string>("status");

  async function handleSubmit(item: any) {
    if (item.url === "") {
      setUrlError(requiredErrorText);
      return false;
    }

    if (item.checkFrequency === "") {
      setCheckFrequencyError(requiredErrorText);
      return false;
    }

    if (item.tcpTimeout === "") {
      setTcpTimeoutError(requiredErrorText);
      return false;
    }

    axios
      .post("https://betteruptime.com/api/v2/monitors", item, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` },
      })
      .then(() => {
        popToRoot();

        showToast({ title: "Success", message: "Successfully added monitor" });
      })
      .catch((error) => {
        showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
      });
  }

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  function dropCheckFrequencyErrorIfNeeded() {
    if (checkFrequencyError && checkFrequencyError.length > 0) {
      setCheckFrequencyError(undefined);
    }
  }

  function dropTcpTimeoutErrorIfNeeded() {
    if (tcpTimeoutError && tcpTimeoutError.length > 0) {
      setTcpTimeoutError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Monitor" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="monitor_type"
        title="Monitor Type"
        onChange={(value) => setMonitorType(value)}
      >
        <Form.Dropdown.Item key="status" value="status" title="Status" />
        <Form.Dropdown.Item key="ping" value="ping" title="Ping" />
      </Form.Dropdown>
      <Form.TextField
        id="url"
        title={monitorType === "status" ? "URL" : "Host"}
        placeholder={monitorType === "status" ? "https://raycast.com" : "76.76.21.21"}
        ref={urlRef}
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError(requiredErrorText);
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      {monitorType === "status" && (
        <Form.TextField
          id="check_frequency"
          title="Check Frequency (seconds)"
          defaultValue="180"
          ref={checkFrequencyRef}
          error={checkFrequencyError}
          onChange={dropCheckFrequencyErrorIfNeeded}
          onBlur={(event) => {
            if (event.target.value?.length == 0) {
              setCheckFrequencyError(requiredErrorText);
            } else {
              dropCheckFrequencyErrorIfNeeded();
            }
          }}
        />
      )}
      {monitorType === "ping" && (
        <Form.TextField
          id="tcp_timeout"
          title="Ping Timeout"
          defaultValue="5"
          ref={tcpTimeoutRef}
          error={tcpTimeoutError}
          onChange={dropTcpTimeoutErrorIfNeeded}
          onBlur={(event) => {
            if (event.target.value?.length == 0) {
              setTcpTimeoutError(requiredErrorText);
            } else {
              dropTcpTimeoutErrorIfNeeded();
            }
          }}
        />
      )}
      <Form.Checkbox
        id="call"
        label="Call"
        defaultValue={false}
      />
      <Form.Checkbox
        id="sms"
        label="Send SMS"
        defaultValue={false}
      />
      <Form.Checkbox
        id="email"
        label="Send Email"
        defaultValue={true}
      />
      <Form.Checkbox
        id="push"
        label="Push Notification"
        defaultValue={false}
      />
      <Form.TextField
        id="pronounceable_name"
        title="Pronounceable Name"
      />
    </Form>
  );
}
