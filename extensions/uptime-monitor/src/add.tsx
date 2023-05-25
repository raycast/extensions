import { Form, ActionPanel, Action, showToast, Toast, environment, launchCommand, LaunchType } from "@raycast/api";
import fs from "fs";
import path from "path";

type Values = {
  name: string;
  url: string;
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

export default function Command() {
  function handleSubmit(values: Values) {
    const data = `${values.url}, ${values.name}`;

    const filePath = path.join(environment.supportPath, "inputs.txt");

    if (fs.existsSync(filePath)) {
      // Do something with the file
    } else {
      // Create an empty file
      // Use filePath as the first argument and omit or change the third argument
      const fd = fs.openSync(filePath, "w");
      fs.closeSync(fd);
    }

    // Check if input file is empty
    const fileData = fs.readFileSync(filePath, "utf8");
    if (fileData.trim().length === 0) {
      // Write input data to file if file is empty
      fs.writeFile(filePath, data, (err) => {
        if (err) {
          console.error(err);
          showToast({ title: "Failed to write to file", message: err.message });
        } else {
          console.log("Inputs written to file");
          showToast({ title: "", message: "Successfully Added Monitor" });
          launchCommand({ name: "background", type: LaunchType.UserInitiated });
          launchCommand({ name: "background", type: LaunchType.UserInitiated });
        }
      });
    } else {
      // Check if display name is unique
      const lines = fileData.split("\n");
      const matchingLine = lines.find((line) => {
        const lineValues = line.split(",");
        return lineValues.length >= 2 && lineValues[1].trim() === values.name.trim();
      });

      if (matchingLine) {
        // Display error message if display name is not unique
        showToast({ title: "Error", message: "Display name already exists in the file", style: Toast.Style.Failure });
      } else {
        // Write input to file if display name is unique
        fs.appendFile(filePath, `\n${data}`, (err) => {
          if (err) {
            console.error(err);
            showToast({ title: "Failed to write to file", message: err.message });
          } else {
            showToast({ title: "", message: "Successfully Added Monitor" });
            launchCommand({ name: "background", type: LaunchType.UserInitiated });
            launchCommand({ name: "background", type: LaunchType.UserInitiated });
          }
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form showcases all available form elements." />
      <Form.TextField id="name" title="Display Name" placeholder="Google" defaultValue="Google" />
      <Form.TextField id="url" title="URL" placeholder="https://google.com" defaultValue="https://google.com" />
    </Form>
  );
}
