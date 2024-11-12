import { ActionPanel, Action, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";
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
}

export default function SendBook() {
  const base_url = "https://send.djazz.se/upload";
  const timeout = 30000; // 30 seconds
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    let fileStream = null;

    try {
      setIsLoading(true);

      const bookPath = values.bookFile[0];
      const key = values.key.trim().toUpperCase();

      // Validate key
      if (key.length !== 4) {
        throw new Error("Key must be 4 characters");
      }

      // Show progress toast
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending to e-reader...",
      });

      // Create form data
      const formData = new FormData();

      // Add form fields BEFORE file, This order matters for multipart/form-data processing
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
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "text",
        validateStatus: (status) => status >= 200 && status < 300,
        timeout: timeout,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.loaded === progressEvent.total) {
            toast.message = "Processing...";
          } else if (progressEvent.total) {
            const progress =
              Math.round(progressEvent.loaded / progressEvent.total) * 100;
            toast.message = `Uploading... ${progress}%`;
          } else {
            toast.message = "Uploading...";
          }
        },
      });

      if (response.status === 200) {
        toast.style = Toast.Style.Success;
        toast.title = "Success!";
        toast.message = "Book sent to e-reader";
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Detailed Error", error);

      let errorMessage = "An unknown error occurred";
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.log("Response Error:", {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data,
          });
          errorMessage = `${error.response.status} ${error.response.statusText}`;
        } else if (error.request) {
          console.log("Request Error:", error.request);
          errorMessage = "Network error occurred";
        } else {
          console.log("Axios Error:", error.message);
          errorMessage = error.message;
        }
      } else {
        console.log("Error:", error);
        errorMessage = "An unknown error occurred";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      if (fileStream) {
        fileStream.destroy();
      }
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="bookFile"
        title="Book File"
        allowMultipleSelection={false}
        canChooseFiles={true}
        canChooseDirectories={false}
      />
      <Form.TextField
        id="key"
        title="E-Reader Key"
        placeholder="Enter 4-character key shown on your device"
      />
      <Form.Checkbox
        id="kepubify"
        label="Convert to Kobo format (with Kepubify)"
        defaultValue={true}
      />
      <Form.Checkbox
        id="kindlegen"
        label="Convert to Kindle format (with KindleGen)"
        defaultValue={true}
      />
      <Form.Checkbox
        id="cropMargins"
        label="Crop PDF margins"
        defaultValue={false}
      />
      <Form.Checkbox
        id="transliterate"
        label="Transliterate filename"
        defaultValue={false}
      />
      <Form.Description
        title="Note"
        text='Open "https://send.djazz.se/" on your e-reader to get the "E-Reader key"'
      />
    </Form>
  );
}
