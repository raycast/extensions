import { Form } from "@raycast/api";
import { useState } from "react";

type FormatOptions = {
  spaceBetweenCurlyBrackets: boolean;
  spaceBetweenSquareBrackets: boolean;
};

export default function Command() {
  const [transformedJson, setTransformedJson] = useState("");
  const [invalid, setInvalid] = useState<string | undefined>();

  const [formatOptions, setFormatOptions] = useState<FormatOptions>({
    spaceBetweenCurlyBrackets: false,
    spaceBetweenSquareBrackets: false,
  });

  return (
    <Form>
      <Form.Checkbox
        id="curly-braces"
        label="Add space between curly braces"
        value={formatOptions.spaceBetweenCurlyBrackets}
        onChange={(value) => {
          setFormatOptions((previous) => ({
            ...previous,
            spaceBetweenCurlyBrackets: value,
          }));
        }}
      />
      <Form.Checkbox
        id="square-brackets"
        label="Add space between square brackets"
        value={formatOptions.spaceBetweenSquareBrackets}
        onChange={(value) => {
          setFormatOptions((previous) => ({
            ...previous,
            spaceBetweenSquareBrackets: value,
          }));
        }}
      />
      <Form.TextField
        autoFocus
        id="json"
        title="JSON"
        error={invalid}
        placeholder="Enter your JSON"
        onBlur={(event) => {
          const value = event.target.value;

          if (value !== undefined) {
            const formattedJson = formatJSONtoInline(value, formatOptions);

            if (formattedJson !== null) {
              setTransformedJson(formattedJson);
              setInvalid(undefined);
            } else {
              setTransformedJson("");
              setInvalid("Invalid JSON");
            }
          }
        }}
      />
      <Form.TextArea id="transformed-json" value={transformedJson} />
    </Form>
  );
}

function formatJSONtoInline(data: string, options?: FormatOptions): string | null {
  try {
    const jsonObject = JSON.parse(data);

    let base: string;

    base = JSON.stringify(jsonObject).replace(/,/g, ", ").replace(/:"/g, ': "');

    if (options?.spaceBetweenCurlyBrackets) {
      base = base
        .replace(/{/g, "{ ") // Add space after opening curly braces
        .replace(/}/g, " }"); // Add space before closing curly braces
    }

    if (options?.spaceBetweenSquareBrackets) {
      base = base
        .replace(/\[/g, "[ ") // Add space after opening square brackets
        .replace(/\]/g, " ]"); // Add space before closing square brackets
    }

    return base;
  } catch (error) {
    return null;
  }
}
