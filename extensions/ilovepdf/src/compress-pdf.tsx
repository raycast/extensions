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
import CompressTask from "@ilovepdf/ilovepdf-js-core/tasks/CompressTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState } from "react";
import fs from "fs";
import path from "path";

type Values = {
  files: string[];
  compression_level: "low" | "recommended" | "extreme";
};

type Status = "init" | "success" | "failure";

const { APIPublicKey: publicKey, APISecretKey: secretKey, OpenNow: openNow } = getPreferenceValues<Preferences>();

function getDestinationFile(files: string[]): string {
  if (!files.length) {
    return "";
  }
  const file = files[0];
  const fileExtension = path.extname(file);
  const fileName = path.basename(file, fileExtension);
  const directory = path.dirname(file);
  if (files.length == 1) {
    return path.join(directory, `${fileName}_compressed.pdf`);
  }
  return path.join(directory, `compressed_pdfs.zip`);
}

function getSavedPercentage(originalFile: string, compressedFile: string) {
  const originalSize = fs.statSync(originalFile).size;
  const compressedSize = fs.statSync(compressedFile).size;
  return 100 - Math.floor((compressedSize / originalSize) * 100);
}

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

    const toast = await showToast(Toast.Style.Animated, "Processing", "Compressing PDF...");

    let destinationFile = "";
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("compress") as CompressTask;
    const addedFilesPromises = [];
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
      destinationFile = getDestinationFile(values.files);
      setDestinationFilePath(destinationFile);
      await task.process({ compression_level: values.compression_level });
      const data = await task.download();
      fs.writeFileSync(destinationFile, data);

      toast.style = Toast.Style.Success;
      toast.title = "success";
      toast.message =
        "Compressed successfully." +
        (values.files.length == 1
          ? ` Your PDF is ${getSavedPercentage(values.files[0], destinationFile)}% smaller`
          : "");
      setStatus("success");
      setIsLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "failure";
      toast.message = "Error happened during compressing the file.";
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
          <Action.SubmitForm title="Compress PDF" onSubmit={handleSubmit} />
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
      <Form.Dropdown id="compression_level" title="Compression Level" defaultValue="recommended">
        <Form.Dropdown.Item value="recommended" title="Recommended" />
        <Form.Dropdown.Item value="extreme" title="Extreme" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
    </Form>
  );
}
