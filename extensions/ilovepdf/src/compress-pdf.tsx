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
import { getFilePath, MaxInt32 } from "./common/utils";
import { runAppleScript } from "@raycast/utils";

type Values = {
  files: string[];
  compression_level: "low" | "recommended" | "extreme";
};

type Status = "init" | "success" | "failure";

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
  const fileExtension = path.extname(file);
  const fileName = path.basename(file, fileExtension);
  const directory = path.dirname(file);
  if (files.length == 1) {
    return getFilePath(directory, `${fileName}_compressed.pdf`);
  }
  return getFilePath(directory, `compressed_pdfs.zip`);
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
      destinationFile = getDestinationFile(values.files);
      if (askBeforeDownload) {
        try {
          const script = `set file2save to POSIX path of (choose file name with prompt "Save The Compression As" default location "${path.dirname(destinationFile)}" default name "${path.basename(destinationFile)}")`;
          destinationFile = await runAppleScript(script, { timeout: MaxInt32 });
        } catch (e) {
          console.log(e);
          const error = e as { message: string; stderr: string };
          setIsLoading(false);
          if (error.stderr.includes("User cancelled")) {
            toast.hide();
            setStatus("init");
            return;
          }
          toast.style = Toast.Style.Failure;
          toast.title = "failure";
          toast.message = "An error happened during selecting the saving directory";
          setStatus("failure");
        }
      }

      setDestinationFilePath(destinationFile);

      await Promise.all(addedFilesPromises);
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
