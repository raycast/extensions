import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  open,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import MergeTask from "@ilovepdf/ilovepdf-js-core/tasks/MergeTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getFilePath, handleOpenNow, validateFileType } from "./common/utils";
import { Status } from "./common/types";

type Values = {
  files: string[];
};

const {
  APIPublicKey: publicKey,
  APISecretKey: secretKey,
  OpenNow: openNow,
  AskBeforeDownload: askBeforeDownload,
} = getPreferenceValues<Preferences>();

function getDestinationFile(files: string[]): string {
  if (!files.length) {
    return "";
  }
  const file = files[0];
  const directory = path.dirname(file);
  return getFilePath(directory, `merged.pdf`);
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    if (!values.files.length) {
      await showToast(Toast.Style.Failure, "You must select at least a single pdf file.", "Please select a file.");
      setStatus("failure");
      setIsLoading(false);
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Merging PDF...");

    let destinationFile = "";
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("merge") as MergeTask;
    const addedFilesPromises = [];
    try {
      await task.start();
      for (const file of values.files) {
        if (!validateFileType(file, "pdf")) {
          toast.style = Toast.Style.Failure;
          toast.title = "failure";
          toast.message = "You must select PDF files.";
          setStatus("failure");
          setIsLoading(false);
          console.log(`file is not a PDF.`);
          return;
        }
        const iLovePdfFile = new ILovePDFFile(file);
        addedFilesPromises.push(task.addFile(iLovePdfFile));
      }
      destinationFile = getDestinationFile(values.files);

      if (askBeforeDownload) {
        const finalName = await chooseDownloadLocation(
          destinationFile,
          "Save The Merged PDF As",
          setIsLoading,
          setStatus,
          toast,
        );
        if (finalName == undefined) {
          return;
        }
        destinationFile = finalName;
      }

      setDestinationFilePath(destinationFile);

      await Promise.all(addedFilesPromises);
      await task.process();
      const data = await task.download();
      fs.writeFileSync(destinationFile, data);

      toast.style = Toast.Style.Success;
      toast.title = "success";
      toast.message = "Files merged successfully.";
      setStatus("success");
      setIsLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "failure";
      toast.message = `Error happened during merging the files. Reason ${error}`;
      setStatus("failure");
      setIsLoading(false);
      console.log(error);
      return;
    }

    await handleOpenNow(openNow, destinationFile, toast);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Merge PDFs" onSubmit={handleSubmit} icon={Icon.Wand} />
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
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.FilePicker id="files" title="Choose PDF Files" allowMultipleSelection={true} />
    </Form>
  );
}
