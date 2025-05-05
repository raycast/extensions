import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { countries } from "./constants";
import { getUnixTimeFromLocalDate, validateNumber } from "./utils/datetime";
import { copyToClipboardWithToast } from "./utils/clipboard";
import { GenerateTimestampFormValues } from "./types";

export default function Command() {
  const now = new Date();
  const { handleSubmit, itemProps, values } = useForm<GenerateTimestampFormValues>({
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
      if (!countryObj) return;
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
      <Form.Description
        title="Result"
        text={(() => {
          const countryObj = countries.find((c) => c.id === values.country);
          if (!countryObj) return "Enter date, time, and country, then press Convert.";
          if (
            [values.year, values.month, values.day, values.hour, values.minute, values.second].some(
              (v) => !v || isNaN(Number(v)),
            )
          ) {
            return "Enter date, time, and country, then press Convert.";
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
          return `${countryObj.name} ${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}:${values.second} → ${unix}`;
        })()}
      />
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
