import {
  ActionPanel,
  Action,
  Form,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

interface FormValues {
  bookFile: string[];
  key: string;
  kepubify: boolean;
  kindlegen: boolean;
  cropMargins: boolean;
  transliterate: boolean;
  timeout: string;
}

export default function SendBook() {
  const base_url = "https://send.djazz.se/upload";

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const timeout = Number(values.timeout) * 1000;
      let fileStream = null;
      let toast: Toast | null = null;

      try {
        const bookPath = values.bookFile[0];
        const key = values.key.trim().toUpperCase();

        // Show progress toast
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Sending to e-reader...",
        });

        // Create form data
        const formData = new FormData();

        // Add form fields BEFORE file, This order matters for the form-data processing
        formData.append("key", key);
        formData.append("kepubify", values.kepubify ? "on" : "off");
        formData.append("kindlegen", values.kindlegen ? "on" : "off");
        formData.append("pdfcropmargins", values.cropMargins ? "on" : "off");
        formData.append("transliteration", values.transliterate ? "on" : "off");

        // Add file AFTER form fields
        fileStream = fs.createReadStream(bookPath);
        formData.append("file", fileStream, {
          filename: path.basename(bookPath),
          contentType: "application/octet-stream",
        });

        // Set headers
        const headers = {
          ...formData.getHeaders(),
          Accept: "*/*",
        };

        const response = await axios({
          method: "post",
          url: base_url,
          data: formData,
          headers: headers,
          responseType: "text",
          validateStatus: (status) => status >= 200 && status < 300,
          timeout: timeout,
          onUploadProgress: (progressEvent) => {
            if (!toast) return;

            if (progressEvent.loaded === progressEvent.total) {
              toast.message = "Processing...";
            } else if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100,
              );
              toast.message = `Uploading... ${progress}%`;
            } else {
              toast.message = "Uploading...";
            }
          },
        });

        // Successful response
        if (response.status >= 200 && response.status < 300) {
          if (toast) {
            toast.style = Toast.Style.Success;
            toast.title = "Success!";
            toast.message = "Book sent to e-reader";
          }

          // Reset form and navigate to the root
          reset();
          await popToRoot({ clearSearchBar: true });
          return true;
        } else {
          throw new Error("Upload failed with status: " + response.status);
        }
      } catch (error) {
        console.error(error);

        let errorMessage = "An unknown error occurred";

        if (axios.isAxiosError(error)) {
          if (error.response) {
            errorMessage = `${error.response.status}: ${error.response.statusText || "Upload failed"}`;
          } else if (error.request) {
            errorMessage = `${error.message || "Request failed"}`;
          } else {
            errorMessage = `${error.message}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
        return false;
      } finally {
        if (fileStream) {
          fileStream.destroy();
        }
      }
    },
    initialValues: {
      kepubify: true,
      kindlegen: true,
      cropMargins: false,
      transliterate: false,
      timeout: "60",
    },
    validation: {
      bookFile: FormValidation.Required,
      key: (value) => {
        if (!value || value.trim().length !== 4) {
          return "Key must be 4 characters";
        }
      },
      timeout: (value) => {
        if (!value || isNaN(Number(value))) {
          return "Timeout must be a number";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.bookFile}
        title="Book File"
        allowMultipleSelection={false}
        canChooseFiles={true}
        canChooseDirectories={false}
      />
      <Form.TextField
        {...itemProps.key}
        title="E-Reader Key"
        placeholder="Enter 4-character key shown on your device"
      />
      <Form.Checkbox
        {...itemProps.kepubify}
        label="Convert to Kobo format (with Kepubify)"
      />
      <Form.Checkbox
        {...itemProps.kindlegen}
        label="Convert to Kindle format (with KindleGen)"
      />
      <Form.Checkbox {...itemProps.cropMargins} label="Crop PDF margins" />
      <Form.Checkbox
        {...itemProps.transliterate}
        label="Transliterate filename"
      />
      <Form.TextField {...itemProps.timeout} title="Timeout (seconds)" />
      <Form.Description
        title="Note"
        text='Open "https://send.djazz.se/" on your e-reader to get the "E-Reader key"'
      />
    </Form>
  );
}
