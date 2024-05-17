import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  closeMainWindow,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import PdfJpgTask from "@ilovepdf/ilovepdf-js-core/tasks/PdfJpgTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState } from "react";
import fs from "fs";
import path from "path";

type Values = {
  files: string[];
  mode: "pages" | "extract";
};

type Status = "init" | "success" | "failure";

const { APIPublicKey: publicKey, APISecretKey: secretKey, OpenNow: openNow } = getPreferenceValues<Preferences>();

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    if (!values.files.length) {
      await showToast(Toast.Style.Failure, "You must select at least a single pdf file", "Please select a file");
      setStatus("failure");
      setIsLoading(false);
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Converting PDF...");

    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("pdfjpg") as PdfJpgTask;
    const addedFilesPromises = [];
    const destinationFile = path.join(path.dirname(values.files[0]), "pdf_images.zip");
    try {
      await task.start();
      for (const file of values.files) {
        const fileExtension = path.extname(file);
        if (fileExtension != ".pdf") {
          toast.style = Toast.Style.Failure;
          toast.title = "failure";
          toast.message = "You must select a PDF file.";
          setStatus("failure");
          setIsLoading(false);
          console.log(`file is not a PDF received extension is ${fileExtension}`);
          return;
        }
        const iLovePdfFile = new ILovePDFFile(file);
        addedFilesPromises.push(task.addFile(iLovePdfFile));
      }
      await Promise.all(addedFilesPromises);
      setDestinationFilePath(destinationFile);
      await task.process({ pdfjpg_mode: values.mode });
      const data = await task.download();
      fs.writeFileSync(destinationFile, data);

      toast.style = Toast.Style.Success;
      toast.title = "success";
      toast.message = "Converted successfully.";
      setStatus("success");
      setIsLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "failure";
      toast.message = "Error happened during converting PDF to images.";
      setStatus("failure");
      setIsLoading(false);
      console.log(error);
      return;
    }

    if (openNow) {
      await closeMainWindow();
      open(destinationFile);
    } else {
      toast.primaryAction = {
        title: "Open File",
        onAction: () => {
          open(destinationFile);
        },
      };
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert PDF" onSubmit={handleSubmit} />
          {status == "success" ? <Action.ShowInFinder title="Show in Finder" path={destinationFilePath} /> : null}
          {status == "success" ? (
            <Action.CopyToClipboard title="Copy Path to Clipboard" content={destinationFilePath} />
          ) : null}
          {status == "success" ? (
            <Action
              title="Open File"
              onAction={() => {
                open(destinationFilePath);
              }}
            />
          ) : null}
          {status == "failure" ? (
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.FilePicker id="files" title="Choose PDF files" allowMultipleSelection={true} />
      <Form.Dropdown id="mode" title="Conversion Mode" defaultValue="pages">
        <Form.Dropdown.Item value="pages" title="Convert every PDF page to a JPG image" />
        <Form.Dropdown.Item value="extract" title="Extract all embedded images to separate images" />
      </Form.Dropdown>
    </Form>
  );
}
