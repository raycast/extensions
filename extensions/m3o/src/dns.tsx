import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  apiKey: string;
}

interface CommandForm {
  domain: string;
  type: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState({} as any);
  const [domainError, setDomainError] = useState<string | undefined>();

  function dropDomainErrorIfNeeded() {
    if (domainError && domainError.length > 0) {
      setDomainError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.domain == "") {
      setDomainError("This field is required!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving DNS...",
    });

    const data = {
      name: values.domain,
      type: values.type,
    };

    const options = {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    };

    await axios
      .post("https://api.m3o.com/v1/dns/Query", data, options)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "DNS retrieved successfully";

        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve DNS";
        toast.message = error.response.data.detail ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get DNS" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {output && <Action.CopyToClipboard title="Copy to Clipboard" content={output} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="raycast.com"
        error={domainError}
        onChange={dropDomainErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDomainError("The field is required!");
          } else {
            dropDomainErrorIfNeeded();
          }
        }}
      />

      <Form.Dropdown id="type" title="Select type" defaultValue="A">
        <Form.Dropdown.Item value="A" title="A" />
        <Form.Dropdown.Item value="AAAA" title="AAAA" />
        <Form.Dropdown.Item value="MX" title="MX" />
        <Form.Dropdown.Item value="SRV" title="SRV" />
      </Form.Dropdown>

      {output ? (
        <>
          <Form.Separator />
          {Object.values(output).map((record: any, index: number) => {
            if (Array.isArray(record)) {
              return record.map((record: any, index: number) => (
                <Form.Description
                  key={index}
                  title={Object.keys(record)[index]}
                  text={`${Object.values(record)[index]}`}
                />
              ));
            }

            return (
              <Form.Description
                key={index}
                title={Object.keys(output)[index]}
                text={`${Object.values(output)[index]}`}
              />
            );
          })}
        </>
      ) : null}
    </Form>
  );
}
