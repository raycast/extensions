import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Dispatch, SetStateAction } from "react";

interface SharedFormProps {
  apiUrl: string;
  inputType: string;
  number: string;
  setNumber: Dispatch<SetStateAction<string>>;
  allowNegative: boolean;
}

const SharedForm = ({ apiUrl, inputType, number, setNumber, allowNegative }: SharedFormProps) => {
  const { isLoading, data, revalidate } = useFetch<string>(apiUrl, { execute: number !== "-" });

  const handleChange = (value: string) => {
    if (value !== "" && isNaN(Number(value)) && value !== "-") {
      return;
    }
    // If negative values aren't allowed, this disables them.
    if (!allowNegative && (value === "-" || value.charAt(0) === "-")) {
      return;
    }
    setNumber(value.replace(/\s+/, ""));
    revalidate();
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} icon={Icon.RotateClockwise} />
          <Action.CopyToClipboard title="Copy Fact" content={data ? data : ""} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        autoFocus
        placeholder={`Type in a ${inputType}`}
        value={number}
        onChange={handleChange}
        info={`The value can be ${allowNegative ? "positive or negative." : "positive only."}`}
      />
      <Form.Description text={isLoading ? "Loading..." : data ? data : ""} />
    </Form>
  );
};

export default SharedForm;
