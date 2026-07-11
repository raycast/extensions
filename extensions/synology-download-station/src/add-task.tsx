import { ActionPanel, Action, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getSynologyAPI, handleAPIError } from "./lib/synology-api";
import { TaskCreateRequest } from "./lib/types";
import { validateUrl } from "./lib/utils";
import ListTasksCommand from "./list-tasks";

interface AddTaskFormValues {
  url: string;
  destination?: string;
}

export default function AddTaskCommand() {
  const synologyAPI = getSynologyAPI();
  const navigation = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddTaskFormValues>({
    async onSubmit(values) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Creating Task",
          message: "Adding download task...",
        });

        const request: TaskCreateRequest = {
          uri: values.url.trim(),
        };

        if (values.destination?.trim()) {
          request.destination = values.destination.trim();
        }

        await synologyAPI.createTask(request);

        await showToast({
          style: Toast.Style.Success,
          title: "Task Created",
          message: "Download task added successfully",
        });

        navigation.push(<ListTasksCommand />);
      } catch (error) {
        await handleAPIError(error);
      }
    },
    validation: {
      url: (value) => {
        if (!value?.trim()) {
          return "File URL is required";
        }

        if (!validateUrl(value)) {
          return "Please enter a valid HTTP/HTTPS URL, FTP URL, or magnet link";
        }
      },
      destination: (value) => {
        // Destination is optional, so only validate if provided
        if (value && value.length > 200) {
          return "Destination path is too long";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Add New Download Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="File URL"
        placeholder="Enter a direct download URL, FTP URL, or magnet link"
        autoFocus
        {...itemProps.url}
      />

      <Form.TextField
        title="Destination Folder"
        placeholder="Leave empty for default destination"
        {...itemProps.destination}
      />
    </Form>
  );
}
