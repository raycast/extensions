import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { fileFromPath } from "formdata-node/file-from-path";
import { getAuthHeaders, handleDomain, timeoutFetch } from "./utils";
import { BasePreferences } from "./models";
import { useForm, FormValidation } from "@raycast/utils";
import { FormData } from "formdata-node";

interface SubmitFormValues {
  torrentFile: string[];
  posterUrl: string;
  title: string;
}

export default function Command() {
  const { torrserverUrl } = getPreferenceValues<BasePreferences>();

  const { handleSubmit, itemProps, setValue } = useForm<SubmitFormValues>({
    onSubmit: async (values) => {
      const { torrentFile, posterUrl, title } = values;

      if (!torrentFile || torrentFile.length === 0) {
        showToast(Toast.Style.Failure, "No file selected", "Please select a torrent file.");
        return false;
      }

      const filePath = torrentFile[0];

      if (!filePath) {
        showToast(Toast.Style.Failure, "File path not available", "Unable to get the file path.");
        return false;
      }

      const formData = new FormData();
      formData.append("save", "true");

      try {
        const file = await fileFromPath(filePath);
        formData.append("file", file, file.name);
        formData.append("title", title);

        if (posterUrl) {
          formData.append("poster", posterUrl);
        }

        const serverUrl = `${handleDomain(torrserverUrl)}/torrent/upload`;
        showToast(Toast.Style.Animated, "Processing...");

        const response = await timeoutFetch(handleDomain(serverUrl), {
          method: "POST",
          body: formData,
          headers: {
            ...getAuthHeaders(),
          },
        });

        if (!response.ok) {
          showToast(Toast.Style.Failure, `Failed to upload torrent: ${response.status} ${response.statusText}`);
          return false;
        }

        showToast(Toast.Style.Success, "Torrent added successfully");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        showToast(Toast.Style.Failure, "Error", `Could not connect to ${torrserverUrl}`);
        return false;
      }

      return true;
    },
    validation: {
      torrentFile: FormValidation.Required,
      title: FormValidation.Required,
    },
  });

  const handleFileChange = (files: string[]) => {
    if (files.length > 0) {
      const selectedFilePath = files[0];
      const fileName = selectedFilePath.split("/").pop();
      setValue("title", fileName || "");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Upload new torrent to TorrServer." />
      <Form.FilePicker
        {...itemProps.torrentFile}
        title="Torrent File"
        allowMultipleSelection={false}
        onChange={handleFileChange}
      />
      <Form.TextField {...itemProps.title} title="Title" placeholder="Auto-filled with file name" />
      <Form.TextField {...itemProps.posterUrl} title="Poster URL" placeholder="Enter poster URL" />
    </Form>
  );
}
