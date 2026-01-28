import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  timezoneApiKey: string;
}

interface CommandForm {
  location: string;
}

interface TimezoneOutput {
  datetime: string;
  timezone_name: string;
  timezone_location: string;
  timezone_abbreviation: string;
  gmt_offset: number;
  is_dst: boolean;
  requested_location: string;
  latitude: number;
  longitude: number;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState({} as TimezoneOutput);
  const [url, setUrl] = useState("");
  const [locationError, setLocationError] = useState<string | undefined>();

  async function handleSubmit(values: CommandForm) {
    if (values.location == "") {
      setLocationError("This field is required!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving timezone...",
    });

    const baseUrl = "https://timezone.abstractapi.com/v1/current_time";
    const location = encodeURIComponent(values.location);
    const url = `${baseUrl}/?api_key=${preferences.timezoneApiKey}&location=${location}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Timezone retrieved successfully";

        setUrl(url);
        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve timezone";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Timezone" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url ? (
            <>
              <Action.OpenInBrowser title="Open in Browser" url={url} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="location" title="Location" placeholder="Enter location" defaultValue="london" />
      {output.requested_location ? (
        <>
          <Form.Separator />
          <Form.Description title="Datetime" text={output.datetime} />
          <Form.Description title="Timezone Name" text={output.timezone_name} />
          <Form.Description title="Timezone Location" text={output.timezone_location} />
          <Form.Description title="Timezone Abbreviation" text={output.timezone_abbreviation} />
          <Form.Description title="GMT Offset" text={`${output.gmt_offset}`} />
          <Form.Description title="Daylight Saving Time" text={output.is_dst ? "Yes" : "No"} />
          <Form.Description title="Requested Location" text={output.requested_location} />
          <Form.Description title="Latitude" text={`${output.latitude}`} />
          <Form.Description title="Longitude" text={`${output.longitude}`} />
        </>
      ) : null}
    </Form>
  );
}
