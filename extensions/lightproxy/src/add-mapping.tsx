import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

interface FormValues {
  hostname: string;
  destination: string;
  isFolder: boolean;
}

export default function Command() {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const { hostname, destination, isFolder } = values;

    if (!hostname || !destination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Both hostname and destination are required",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding mapping...",
        message: `${hostname} → ${destination}`,
      });

      const folderFlag = isFolder ? " --folder" : "";

      const { stderr } = await execPromise(`lightproxy add ${hostname} ${destination}${folderFlag}`);

      if (stderr && stderr.trim().length > 0) {
        throw new Error(stderr);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Mapping added successfully",
        message: `${hostname} → ${destination}`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add mapping",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Add LightProxy Mapping"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Mapping" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="hostname" title="Hostname" placeholder="Enter hostname (e.g., myapp.test)" />
      <Form.TextField
        id="destination"
        title="Destination"
        placeholder="Enter destination (e.g., localhost:3000 or /path/to/folder)"
      />
      <Form.Checkbox id="isFolder" label="Is Folder" info="Check if destination is a folder path instead of a port" />
    </Form>
  );
}
