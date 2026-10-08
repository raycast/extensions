import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { countries } from "./constants";
import { getUnixTimeFromLocalDate, validateNumber } from "./utils/datetime";
import { copyToClipboardWithToast } from "./utils/clipboard";
import { GenerateTimestampFormValues } from "./types";
import { pad2 } from "./utils/pad";
import { useState } from "react";

export default function Command() {
  const [resultText, setResultText] = useState<string>("Enter date, time, and country, then press Convert.");
  const now = new Date();
  const { handleSubmit, itemProps } = useForm<GenerateTimestampFormValues>({
    initialValues: {
      country: countries[0].id,
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString(),
      day: now.getDate().toString(),
      hour: now.getHours().toString(),
      minute: now.getMinutes().toString(),
      second: now.getSeconds().toString(),
    },
    validation: {
      country: FormValidation.Required,
      year: validateNumber,
      month: validateNumber,
      day: validateNumber,
      hour: validateNumber,
      minute: validateNumber,
      second: validateNumber,
    },
    onSubmit(values) {
      const countryObj = countries.find((c) => c.id === values.country);
      if (!countryObj) {
        showFailureToast("Country not found");
        return;
      }
      const unix = getUnixTimeFromLocalDate(
        Number(values.year),
        Number(values.month),
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
        countryObj,
      );
      copyToClipboardWithToast(unix.toString(), "UNIX timestamp copied!");
      setResultText(
        `${countryObj.name} ${values.year}/${pad2(values.month)}/${pad2(values.day)} ${pad2(values.hour)}:${pad2(values.minute)}:${pad2(values.second)} → ${unix}`,
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert & Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Result" text={resultText} />
      <Form.Separator />
      <Form.Dropdown title="Country / Timezone" {...itemProps.country}>
        {countries.map((country) => (
          <Form.Dropdown.Item key={country.id} value={country.id} title={country.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Year" placeholder="2024" {...itemProps.year} />
      <Form.TextField title="Month" placeholder="6" {...itemProps.month} />
      <Form.TextField title="Day" placeholder="1" {...itemProps.day} />
      <Form.Separator />
      <Form.TextField title="Hour" placeholder="12" {...itemProps.hour} />
      <Form.TextField title="Minute" placeholder="34" {...itemProps.minute} />
      <Form.TextField title="Second" placeholder="56" {...itemProps.second} />
      <Form.Separator />
    </Form>
  );
}
