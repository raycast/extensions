import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  // const defaultDate is today, only the date part, but it still needs to be a date object
  const defaultDate = new Date();

  function handleDate(date: Date | null) {
    if (!date) return;
    // 2023-10-24T04:00:00.001Z
    const dateStr = date.toISOString().split("T")[0];
    setDate(dateStr);
  }

  const url = `https://www.thematrixofdestiny.com/share/${date}?name=${name}`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    >
      <Form.Description text="Explore Matrix of Destiny" />
      <Form.TextField id="name" title="Name" placeholder="John Smith" defaultValue="" onChange={setName} />

      <Form.Separator />
      <Form.DatePicker id="date" title="Date" onChange={handleDate} defaultValue={defaultDate} />
    </Form>
  );
}
