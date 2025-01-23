import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import PdfJpgTask from "@ilovepdf/ilovepdf-js-core/tasks/PdfJpgTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getErrorMessage, getFilePath, handleOpenNow, validateFileType } from "./common/utils";
import { Status } from "./common/types";
import { useFetchSelectedFinderItems } from "./hook/use-fetch-selected-finder-items";

type Values = {
  files: string[];
  mode: "pages" | "extract";
};

const {
  APIPublicKey: publicKey,
  APISecretKey: secretKey,
  OpenNow: openNow,
  AskBeforeDownload: askBeforeDownload,
  SelectFileInFinder: selectFileInFinder,
} = getPreferenceValues<Preferences>();

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const {
    isLoading: isFinderLoading,
    selectedFiles: finderSelectedFiles,
    status: fetchStatus,
  } = useFetchSelectedFinderItems(selectFileInFinder);

  useEffect(() => {
    setIsLoading(isFinderLoading);
    setSelectedFiles(finderSelectedFiles);
    setStatus(fetchStatus);
  }, [isFinderLoading, finderSelectedFiles, fetchStatus]);

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    if (!selectFileInFinder && !values.files.length) {
      await showToast(Toast.Style.Failure, "You must select at least a single pdf file.", "Please select a file.");
      setStatus("failure");
      setIsLoading(false);
      return;
    } else {
      values.files = selectedFiles;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Converting PDF...");

    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("pdfjpg") as PdfJpgTask;
    const addedFilesPromises = [];
    let destinationFile = getFilePath(path.dirname(values.files[0]), "pdf_images.zip");
    try {
      await task.start();
      for (const file of values.files) {
        if (!validateFileType(file, "pdf")) {
          toast.style = Toast.Style.Failure;
          toast.title = "failure";
          toast.message = "You must select a PDF file.";
          setStatus("failure");
          setIsLoading(false);
          console.log(`file is not a PDF.`);
          return;
        }
        const iLovePdfFile = new ILovePDFFile(file);
        addedFilesPromises.push(task.addFile(iLovePdfFile));
      }
      if (askBeforeDownload) {
        const finalName = await chooseDownloadLocation(
          destinationFile,
          "Save The Images As",
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
      toast.message = `Error happened during converting PDF to images. Reason ${getErrorMessage(error)}`;
      setStatus("failure");
      setIsLoading(false);
      return;
    }

    await handleOpenNow(openNow, destinationFile, toast);
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
      {selectFileInFinder ? (
        <Form.Description title="Finder Selected File" text={selectedFiles.join("\n")} />
      ) : (
        <Form.FilePicker id="files" title="Choose PDF files" allowMultipleSelection={true} />
      )}
      <Form.Dropdown id="mode" title="Conversion Mode" defaultValue="pages">
        <Form.Dropdown.Item value="pages" title="Convert every PDF page to a JPG image" />
        <Form.Dropdown.Item value="extract" title="Extract all embedded images to separate images" />
      </Form.Dropdown>
    </Form>
  );
}
