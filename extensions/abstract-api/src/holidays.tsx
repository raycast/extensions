import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  holidaysApiKey: string;
}

interface CommandForm {
  country: string;
  date: string;
}

interface HolidayItem {
  name: string;
  name_local: string;
  language: string;
  description: string;
  country: string;
  location: string;
  type: string;
  date: string;
  date_year: string;
  date_month: string;
  date_day: string;
  week_day: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState([] as HolidayItem[]);
  const [url, setUrl] = useState("");
  const [countryError, setCountryError] = useState<string | undefined>();

  function dropCountryErrorIfNeeded() {
    if (countryError && countryError.length > 0) {
      setCountryError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.country == "") {
      setCountryError("This field is required!");
      return;
    }

    if (values.date == "") {
      showToast(Toast.Style.Failure, "Error", "Date is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving holidays...",
    });

    const baseUrl = "https://holidays.abstractapi.com/v1";
    const country = values.country;
    const date = new Date(values.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const url = `${baseUrl}/?api_key=${preferences.holidaysApiKey}&country=${country}&year=${year}&month=${month}&day=${day}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Holidays retrieved successfully";

        setUrl(url);
        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve holidays";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Holidays" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="country"
        title="Country"
        placeholder="Enter country"
        error={countryError}
        onChange={dropCountryErrorIfNeeded}
      />
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
      {output.length > 0 ? (
        <>
          <Form.Separator />
          {output.map((item, index) => (
            <HolidaysItem key={index} item={item} />
          ))}
        </>
      ) : null}
    </Form>
  );
}

function HolidaysItem(props: { item: HolidayItem }) {
  const item = props.item;

  return (
    <>
      <Form.Description title="Name" text={`${item.name}`} />
      <Form.Description title="Name Local" text={`${item.name_local}`} />
      <Form.Description title="Language" text={`${item.language}`} />
      <Form.Description title="Description" text={`${item.description}`} />
      <Form.Description title="Country" text={`${item.country}`} />
      <Form.Description title="Location" text={`${item.location}`} />
      <Form.Description title="Type" text={`${item.type}`} />
      <Form.Description title="Date" text={`${item.date}`} />
      <Form.Description title="Date Year" text={`${item.date_year}`} />
      <Form.Description title="Date Month" text={`${item.date_month}`} />
      <Form.Description title="Date Day" text={`${item.date_day}`} />
      <Form.Description title="Week Day" text={`${item.week_day}`} />
    </>
  );
}
