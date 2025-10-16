import { Action, ActionPanel, Form, showToast, Toast, getPreferenceValues } from "@raycast/api";
import Fs from "fs";
import { readChunk } from "read-chunk";
import imageType, { minimumBytes } from "image-type";
import { useState } from "react";
import got from "got";
import FormData from "form-data";

interface Preferences {
  endpoint: string;
}

export default function Command() {
  const [files, setFiles] = useState<string[] | undefined>([]);
  const [file, setFile] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const preferences = getPreferenceValues<Preferences>();

  async function onFileChange(values: string[]) {
    setFiles(values);
    const file = values[0];
    if (Fs.existsSync(file) && Fs.lstatSync(file).isFile()) {
      const buffer = await readChunk(file, { length: minimumBytes });
      const fileType = await imageType(buffer);
      if (!fileType) {
        setFile(undefined);
        setFileError("Please select a valid image file");
        return;
      }
      setFile(file);
      setFileError(undefined);
    } else {
      setFile(undefined);
      setFileError("Please select at least one file");
    }
  }
  async function handleSubmit() {
    setFileError(undefined);
    if (!file) {
      showToast({
        style: Toast.Style.Failure,
        title: "Image is required",
      });
      setFileError("Image is required");
      return false;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Taking note...",
    });
    try {
      const form = new FormData();
      form.append("file", Fs.createReadStream(file));
      const options = {
        method: "POST",
        isStream: true,
        body: form,
      } as const;
      got(preferences.endpoint, options);
      setFile(undefined);
      setFiles([]);
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "A giant tree grow from a little seed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed saving note";
      toast.message = String(err);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Submit" />
        </ActionPanel>
      }
    >
      <Form.Description title="Upload Image" text="Only jpg / png / gif are allowed, one file at a time." />
      <Form.FilePicker
        id="image"
        title="Image"
        value={files}
        error={fileError}
        onChange={onFileChange}
        allowMultipleSelection={false}
        storeValue={false}
      />
    </Form>
  );
}
