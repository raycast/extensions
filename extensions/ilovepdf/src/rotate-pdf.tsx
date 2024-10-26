import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
  getSelectedFinderItems,
  popToRoot,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import RotateTask from "@ilovepdf/ilovepdf-js-core/tasks/RotateTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getErrorMessage, getFilePath, handleOpenNow } from "./common/utils";
import { Status, Preferences } from "./common/types";

type Values = {
  files: string[];
  degree: string;
};

type Degrees = 0 | 90 | 180 | 270;
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

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    if (!selectFileInFinder && !values.files.length) {
      await showToast(Toast.Style.Failure, "You must select a single file.", "Please select a file.");
      setStatus("failure");
      setIsLoading(false);
      return;
    } else {
      values.files = selectedFiles;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Rotating PDF...");

    values.files.map(async (valueFile) => {
      const file: string = valueFile;
      const fileExtension = path.extname(file);
      const fileName = path.basename(file, fileExtension);
      const directory = path.dirname(file);
      let destinationFile = getFilePath(directory, `${fileName}_rotated.pdf`);

      if (askBeforeDownload) {
        const finalName = await chooseDownloadLocation(
          destinationFile,
          "Save The PDF As",
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
      const instance = new ILovePDFApi(publicKey, secretKey);
      const task = instance.newTask("rotate") as RotateTask;

      try {
        await task.start();
        const iLovePdfFile = new ILovePDFFile(file);
        iLovePdfFile.params.rotate = Number(values.degree) as Degrees;
        await task.addFile(iLovePdfFile);

        await task.process();
        const data = await task.download();
        fs.writeFileSync(destinationFile, data);
        toast.style = Toast.Style.Success;
        toast.title = "success";
        toast.message = "File rotated successfully.";
        setStatus("success");
        setIsLoading(false);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "failure";
        toast.message = `Error happened during processing the file. Reason ${getErrorMessage(error)}`;
        setStatus("failure");
        setIsLoading(false);
        return;
      }

      await handleOpenNow(openNow, destinationFile, toast);
    });
  }

  useEffect(() => {
    const fetchSelectedFinderItems = async () => {
      setIsLoading(true);

      if (selectFileInFinder) {
        try {
          const finderSelectedItems = await getSelectedFinderItems();

          if (finderSelectedItems.length === 0) {
            await showToast(Toast.Style.Failure, "You must select a single file.", "Please select a file.");
            setStatus("failure");
            popToRoot();
            return;
          }

          setSelectedFiles(finderSelectedItems.map((item) => item.path));
        } catch (error) {
          await showToast(Toast.Style.Failure, "Finder Select Error", "Finder isn't the frontmost application");
          setStatus("failure");
          popToRoot();
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchSelectedFinderItems();
  }, []);

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rotate PDF" onSubmit={handleSubmit} />
          {status == "success" ? <Action.ShowInFinder title="Show in Finder" path={destinationFilePath} /> : null}
          {status == "success" ? (
            <Action.CopyToClipboard title="Copy Path to Clipboard" content={destinationFilePath} />
          ) : null}
          {status == "failure" ? (
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {selectFileInFinder ? (
        <Form.Description title="Finder Selected File" text={selectedFiles.join(", ")} />
      ) : (
        <Form.FilePicker id="files" title="Choose a PDF" allowMultipleSelection={false} />
      )}
      <Form.Dropdown id="degree" title="Rotation Degree" defaultValue="0" info="Rotation is clockwise">
        <Form.Dropdown.Item value="0" title="0°" />
        <Form.Dropdown.Item value="90" title="90°" />
        <Form.Dropdown.Item value="180" title="180°" />
        <Form.Dropdown.Item value="270" title="270°" />
      </Form.Dropdown>
    </Form>
  );
}
