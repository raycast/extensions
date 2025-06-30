import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import SplitTask from "@ilovepdf/ilovepdf-js-core/tasks/SplitTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getErrorMessage, getFilePath, handleOpenNow } from "./common/utils";
import filetype from "magic-bytes.js";
import { Status } from "./common/types";
import { useFetchSelectedFinderItems } from "./hook/use-fetch-selected-finder-items";

type Values = {
  files: string[];
};

type SplitModes = "ranges" | "fixed_range" | "remove_pages";

const {
  APIPublicKey: publicKey,
  APISecretKey: secretKey,
  OpenNow: openNow,
  AskBeforeDownload: askBeforeDownload,
  SelectFileInFinder: selectFileInFinder,
} = getPreferenceValues<Preferences>();

function updateFileExtension(filepath: string, data: Uint8Array): string {
  const type = filetype(data);
  let extension = "pdf";
  if (type.length) {
    extension = type[0].extension!;
  }
  const fileExtension = path.extname(filepath);
  const fileName = path.basename(filepath, fileExtension);
  const directory = path.dirname(filepath);
  return getFilePath(directory, `${fileName}.${extension}`);
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");
  const [splitMode, setSplitMode] = useState<SplitModes>("ranges");
  const [mergeAfter, setMergeAfter] = useState<boolean>(false);
  const [ranges, setRanges] = useState<string>("");
  const [defaultText, setDefaultText] = useState<string>("Format: 1,5,10-14");
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
      await showToast(Toast.Style.Failure, "You must select a single file.", "Please select a file.");
      setStatus("failure");
      setIsLoading(false);
      return;
    } else {
      values.files = selectedFiles;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Splitting PDF...");

    for (const valueFile of values.files) {
      const file: string = valueFile;
      const fileExtension = path.extname(file);
      const fileName = path.basename(file, fileExtension);
      const directory = path.dirname(file);
      let destinationFile = getFilePath(directory, `${fileName}_split.pdf`);

      if (askBeforeDownload) {
        const finalName = await chooseDownloadLocation(
          destinationFile,
          "Save The Document As",
          setIsLoading,
          setStatus,
          toast,
        );
        if (finalName == undefined) {
          return;
        }
        destinationFile = finalName;
      }

      const instance = new ILovePDFApi(publicKey, secretKey);
      const task = instance.newTask("split") as SplitTask;
      try {
        await task.start();
        const iLovePdfFile = new ILovePDFFile(file);
        await task.addFile(iLovePdfFile);
        await task.process({
          split_mode: splitMode,
          ranges: splitMode == "ranges" ? ranges : undefined,
          remove_pages: splitMode == "remove_pages" ? ranges : undefined,
          fixed_range: splitMode == "fixed_range" ? Number(ranges) : undefined,
          merge_after: splitMode == "ranges" ? mergeAfter : false,
        });
        const data = await task.download();
        destinationFile = updateFileExtension(destinationFile, data);
        setDestinationFilePath(destinationFile);
        fs.writeFileSync(destinationFile, data);
        toast.style = Toast.Style.Success;
        toast.title = "success";
        toast.message = "File split successfully.";
        setStatus("success");
        setIsLoading(false);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "failure";
        toast.message = `Error happened during splitting the ${fileName} file. Reason ${getErrorMessage(error)}`;
        setStatus("failure");
        setIsLoading(false);
        break;
      }

      await handleOpenNow(openNow, destinationFile, toast);
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Split PDF" onSubmit={handleSubmit} />
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
        <Form.Description title="Finder Selected File" text={selectedFiles.join("\n")} />
      ) : (
        <Form.FilePicker id="files" title="Choose a PDF" allowMultipleSelection={false} />
      )}
      <Form.Dropdown
        id="split_mode"
        title="Split Mode"
        value={splitMode}
        onChange={(newVal: string) => {
          const newMode = newVal as SplitModes;
          setSplitMode(newMode);
          setDefaultText(
            newMode == "ranges"
              ? "Accepted format: 1,5,10-14"
              : newMode == "fixed_range"
                ? "Format is fixed value: 3"
                : " Accepted format: 1,4,8-12,16",
          );
        }}
        info={
          "Ranges: Define different ranges of pages\nFixed Range: Split the PDF with fixed range value\nRemove Pages: Remove the specified Ranges"
        }
      >
        <Form.Dropdown.Item value="ranges" title="Ranges" />
        <Form.Dropdown.Item value="fixed_range" title="Fixed Range" />
        <Form.Dropdown.Item value="remove_pages" title="Remove Pages" />
      </Form.Dropdown>
      <Form.TextArea id="ranges" title={"Range"} value={ranges} onChange={setRanges} placeholder={defaultText} />
      {splitMode == "ranges" ? (
        <Form.Checkbox
          id="merge_after"
          label="Merge all ranges after being split"
          value={mergeAfter}
          onChange={setMergeAfter}
        />
      ) : null}
    </Form>
  );
}
