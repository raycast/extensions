import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { countries, formats } from "./constants";
import { getDateFromUnixTime, validateNumber } from "./utils/datetime";
import { copyToClipboardWithToast } from "./utils/clipboard";
import { ConvertTimestampFormValues } from "./types";

export default function Command() {
  const { handleSubmit, itemProps, values } = useForm<ConvertTimestampFormValues>({
    initialValues: {
      unixTime: "",
      country: countries[0].id,
      format: formats[0].id,
    },
    validation: {
      unixTime: validateNumber,
      country: FormValidation.Required,
      format: FormValidation.Required,
    },
    onSubmit(values) {
      const country = countries.find((c) => c.id === values.country);
      const format = formats.find((f) => f.id === values.format);
      if (!country || !format) return;
      const date = getDateFromUnixTime(Number(values.unixTime));
      const result = format.format(date, country);
      copyToClipboardWithToast(result.split(": ")[1] ?? "", "Datetime copied!");
    },
  });

  // 結果のプレビュー
  const resultText = (() => {
    const country = countries.find((c) => c.id === values.country);
    const format = formats.find((f) => f.id === values.format);
    if (!country || !format || !values.unixTime || isNaN(Number(values.unixTime))) {
      return "Please enter a UNIX timestamp and press the convert button";
    }
    const date = getDateFromUnixTime(Number(values.unixTime));
    return format.format(date, country);
  })();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert & Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Converted Time" text={resultText} />
      <Form.Separator />
      <Form.TextField title="UNIX Timestamp" placeholder="1713945600" {...itemProps.unixTime} />
      <Form.Dropdown title="Select Country" {...itemProps.country}>
        {countries.map((country) => (
          <Form.Dropdown.Item key={country.id} value={country.id} title={country.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Display Format" {...itemProps.format}>
        {formats.map((format) => (
          <Form.Dropdown.Item key={format.id} value={format.id} title={format.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
