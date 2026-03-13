import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const DateFacts = () => {
  const [date, setDate] = useState<Date | null>(null);

  const apiUrl = `http://numbersapi.com/${date ? `${date.getMonth() + 1}/${date.getDate()}` : "random"}/date`;

  const { isLoading, data, revalidate } = useFetch<string>(apiUrl);

  const handleChange = (value: Date | null) => {
    setDate(value);
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
      <Form.DatePicker
        id="datepicker"
        autoFocus
        value={date}
        onChange={handleChange}
        info="Only the date and month will be used. The year and time will be ignored."
      />
      <Form.Description text={isLoading ? "Loading..." : data ? data : ""} />
    </Form>
  );
};

export default DateFacts;
