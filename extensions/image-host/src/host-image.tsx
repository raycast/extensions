import { Action, ActionPanel, Form, Clipboard, popToRoot, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import imgbbUploader from "imgbb-uploader";

import { useState } from "react";

const supportedExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp", "heic"];

interface FormValues {
  files: string[];
}

const preferences: Preferences = getPreferenceValues();

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      setIsLoading(true);

      imgbbUploader(preferences.apiKey, values.files[0])
        .then(async (response: { url: string }) => {
          await Clipboard.copy(response.url);

          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Image URL copied to clipboard!",
          });

          setIsLoading(false);
          popToRoot({ clearSearchBar: true });
        })
        .catch((error: string) => {
          showFailureToast(error, { title: "Failed to host image!" });
          setIsLoading(false);
        });
    },
    validation: {
      files: (value) => {
        if (value && value.length > 0) {
          const ext = value[0].split(".").pop();
          if (!ext || !supportedExtensions.includes(ext)) {
            return "Unsupported file type";
          }
        } else {
          return "Please select a file";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Host Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker allowMultipleSelection={false} title="Image" {...itemProps.files} />

      <Form.Description text="Choose an image to host (png, jpg, jpeg, gif, bmp, tiff, webp, heic)" />
    </Form>
  );
}
