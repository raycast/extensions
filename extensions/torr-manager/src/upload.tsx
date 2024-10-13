import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { FormData } from "formdata-node";
import { fileFromPath } from "formdata-node/file-from-path";
import { getAuthHeaders } from "./utils";
import { Preferences } from "./models";
import { useState } from "react";

interface SubmitFormValues {
  torrentFile: string[];
  posterUrl: string;
  title: string;
}

export default function Command() {
  const { torrserverUrl } = getPreferenceValues<Preferences>();
  const [title, setTitle] = useState<string>("");

  async function handleSubmit(values: SubmitFormValues) {
    const { torrentFile, posterUrl } = values;

    if (!torrentFile || torrentFile.length === 0) {
      showToast(Toast.Style.Failure, "No file selected", "Please select a torrent file.");
      return;
    }

    const filePath = torrentFile[0];

    if (!filePath) {
      showToast(Toast.Style.Failure, "File path not available", "Unable to get the file path.");
      return;
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

      const serverUrl = `${torrserverUrl}/torrent/upload`;

      const response = await fetch(serverUrl, {
        method: "POST",
        body: formData,
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to upload torrent: ${response.status} ${response.statusText}\n${errorData}`);
      }

      showToast(Toast.Style.Success, "Torrent added successfully");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Something went wrong");
    }
  }

  const handleFileChange = (files: string[]) => {
    if (files.length > 0) {
      const selectedFilePath = files[0];
      const fileName = selectedFilePath.split("/").pop();
      setTitle(fileName || "");
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
        id="torrentFile"
        title="Torrent File"
        allowMultipleSelection={false}
        onChange={handleFileChange}
      />
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
        placeholder="Auto-filled with file name"
      />
      <Form.TextField id="posterUrl" title="Poster URL" placeholder="Enter poster URL" />
    </Form>
  );
}
