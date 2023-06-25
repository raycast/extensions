import { Form, ActionPanel, Action, showToast, environment } from "@raycast/api";
import fs from "fs";
import path from "path";

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

const REMEMBERING_FILE = path.join(environment.supportPath, "remembering.csv");
export default function Command() {
  function handleSubmit(values: Values) {
    const expirationDate = calculateExpirationDate(values.dropdown);
    const data = `${expirationDate.toISOString()},${values.textarea}\n`;

    // Check if the file exists
    let fileExists = false;
    try {
      fs.accessSync(REMEMBERING_FILE);
      fileExists = true;
    } catch (error) {
      console.log("File no existe");
    }

    // Write to the file
    if (fileExists) {
      // Append to the existing file
      fs.appendFileSync(REMEMBERING_FILE, data);
    } else {
      // Create a new file
      fs.writeFileSync(REMEMBERING_FILE, data);
    }

    // Log the expiration date and what to remember
    console.log(`Remembering "${values.textarea}" until ${expirationDate.toString()}`);
    showToast({
      title: "Submitted form",
      message: `Remembering "${values.textarea}" until ${expirationDate.toString()}`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Input anything here and I will remember it for a designated time." />
      <Form.TextArea
        id="textarea"
        title="Remember This:"
        placeholder="Meeting on Tuesday"
        defaultValue="Meeting on Tuesday"
      />
      <Form.Separator />
      <Form.Dropdown id="dropdown" title="How long should I remember this for?">
        <Form.Dropdown.Item value="Forever" title="Forever" />
        <Form.Dropdown.Item value="10min" title="10 Minutes" />
        <Form.Dropdown.Item value="30min" title="30 Minutes" />
        <Form.Dropdown.Item value="1h" title="1 Hour" />
        <Form.Dropdown.Item value="2h" title="2 Hours" />
        <Form.Dropdown.Item value="3h" title="3 Hours" />
        <Form.Dropdown.Item value="6h" title="6 Hours" />
        <Form.Dropdown.Item value="12h" title="12 Hours" />
        <Form.Dropdown.Item value="1day" title="1 Day" />
        <Form.Dropdown.Item value="2day" title="2 Days" />
        <Form.Dropdown.Item value="1week" title="1 Week" />
        <Form.Dropdown.Item value="2week" title="2 Weeks" />
        <Form.Dropdown.Item value="1month" title="1 Month" />
        <Form.Dropdown.Item value="3month" title="3 Months" />
        <Form.Dropdown.Item value="6month" title="6 Months" />
        <Form.Dropdown.Item value="1year" title="1 Year" />
        <Form.Dropdown.Item value="2year" title="2 Years" />
        <Form.Dropdown.Item value="5year" title="5 Years" />
      </Form.Dropdown>
    </Form>
  );
}

function calculateExpirationDate(duration: string): Date {
  const now = new Date();
  switch (duration) {
    case "Forever":
      return new Date(now.getFullYear() + 100, 0, 1); // 100 years from now
    case "1day":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
    case "2day":
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    case "1week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    case "2week":
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
    case "1month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month from now
    case "3month":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months from now
    case "6month":
      return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months from now
    case "1year":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    case "2year":
      return new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000); // 2 years from now
    case "5year":
      return new Date(now.getTime() + 1, 825 * 24 * 60 * 60 * 1000); // 2 years from now
    case "10min":
      return new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    case "30min":
      return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    case "2h":
      return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    case "3h":
      return new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    case "6h":
      return new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now
    case "12h":
      return new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    default:
      throw new Error(`Invalid duration: ${duration}`);
  }
}
