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
import PageNumberTask from "@ilovepdf/ilovepdf-js-core/tasks/PageNumberTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getErrorMessage, getFilePath, handleOpenNow } from "./common/utils";
import { Status } from "./common/types";
import { useFetchSelectedFinderItems } from "./hook/use-fetch-selected-finder-items";

type Values = {
  files: string[];
};

type Fonts =
  | "Arial Unicode MS"
  | "Arial"
  | "Verdana"
  | "Courier"
  | "Times New Roman"
  | "Comic Sans MS"
  | "WenQuanYi Zen Hei"
  | "Lohit Marathi";
type VerticalPosition = "bottom" | "top";
type HorizontalPosition = "left" | "center" | "right";

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
  const [facingPage, setFacingPage] = useState<boolean>(false);
  const [firstCover, setFirstCover] = useState<boolean>(false);
  const [startingNumber, setStartingNumber] = useState<string>("1");
  const [pages, setPages] = useState<string>("all");

  const [verticalPosition, setVerticalPosition] = useState<string>("bottom");
  const [horizontalPosition, setHorizontalPosition] = useState<string>("center");
  const [format, setFormat] = useState<string>("{n}");
  const [font, setFont] = useState<string>("Arial Unicode MS");
  const [fontSize, setFontSize] = useState<string>("14");

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

    const toast = await showToast(Toast.Style.Animated, "Processing", "Adding Page Number...");

    for (const valueFile of values.files) {
      const file: string = valueFile;
      const fileExtension = path.extname(file);
      const fileName = path.basename(file, fileExtension);
      const directory = path.dirname(file);
      let destinationFile = getFilePath(directory, `${fileName}_numbered.pdf`);

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
      const task = instance.newTask("pagenumber") as PageNumberTask;

      try {
        await task.start();
        const iLovePdfFile = new ILovePDFFile(file);
        await task.addFile(iLovePdfFile);
        await task.process({
          facing_pages: facingPage,
          first_cover: firstCover,
          text: format,
          vertical_position: verticalPosition as VerticalPosition,
          horizontal_position: horizontalPosition as HorizontalPosition,
          starting_number: Number(startingNumber),
          font_family: font as Fonts,
          font_size: Number(fontSize),
        });
        const data = await task.download();
        fs.writeFileSync(destinationFile, data);
        toast.style = Toast.Style.Success;
        toast.title = "success";
        toast.message = "File processed successfully.";
        setStatus("success");
        setIsLoading(false);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "failure";
        toast.message = `Error happened during processing the ${fileName} file. Reason ${getErrorMessage(error)}`;
        setStatus("failure");
        setIsLoading(false);
        break;
      }

      await handleOpenNow(openNow, destinationFile, toast);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Page Number" onSubmit={handleSubmit} />
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
      <Form.Checkbox
        id="facingPage"
        label="Facing pages"
        title="Page Mode"
        value={facingPage}
        onChange={setFacingPage}
        info="Convert the PDF into a face page mode"
      />
      <Form.Checkbox
        id="firstCover"
        label="First page is cover"
        title=" "
        value={firstCover}
        onChange={setFirstCover}
        info="If first page is cover, it will not be numbered"
      />
      <Form.TextField id="startingNumber" title="Starting Number" value={startingNumber} onChange={setStartingNumber} />
      <Form.TextField
        id="pages"
        title="Pages"
        value={pages}
        onChange={setPages}
        placeholder="Examples: all, 3-end, 1,3,4-9, -2-end"
      />
      <Form.Dropdown
        id="verticalPosition"
        title="Vertical Position"
        value={verticalPosition}
        onChange={setVerticalPosition}
      >
        <Form.Dropdown.Item value="bottom" title="bottom" />
        <Form.Dropdown.Item value="top" title="top" />
      </Form.Dropdown>
      <Form.Dropdown
        id="horizontalPosition"
        title="Horizontal Position"
        value={horizontalPosition}
        onChange={setHorizontalPosition}
        info="if the parameter facing page is checked, facing pages will have their page numbers positioned symmetrically, on the left and the right."
      >
        <Form.Dropdown.Item value="left" title="left" />
        <Form.Dropdown.Item value="center" title="center" />
        <Form.Dropdown.Item value="right" title="right" />
      </Form.Dropdown>
      <Form.TextField
        id="format"
        title="Numbering Format"
        value={format}
        onChange={setFormat}
        info="Text samples: {n}, Page {n}, Page {n} of {p}."
      />
      <Form.Dropdown id="font" title="Font" value={font} onChange={setFont}>
        <Form.Dropdown.Item value="Arial" title="Arial" />
        <Form.Dropdown.Item value="Arial Unicode MS" title="Arial Unicode MS" />
        <Form.Dropdown.Item value="Verdana" title="Verdana" />
        <Form.Dropdown.Item value="Courier" title="Courier" />
        <Form.Dropdown.Item value="Times New Roman" title="Times New Roman" />
        <Form.Dropdown.Item value="Comic Sans MS" title="Comic Sans MS" />
        <Form.Dropdown.Item value="WenQuanYi Zen Hei" title="WenQuanYi Zen Hei" />
        <Form.Dropdown.Item value="Lohit Marathi" title="Lohit Marathi" />
      </Form.Dropdown>
      <Form.TextField id="fontSize" title="Font Size" value={fontSize} onChange={setFontSize} />
    </Form>
  );
}
