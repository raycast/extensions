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
import PdfaTask from "@ilovepdf/ilovepdf-js-core/tasks/PdfaTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getFilePath, handleOpenNow } from "./common/utils";
import { Status } from "./common/types";
import { useFetchSelectedFinderItems } from "./hook/use-fetch-selected-finder-items";

type Values = {
  files: string[];
};
type ConfromanceLevel = "pdfa-1b" | "pdfa-1a" | "pdfa-2b" | "pdfa-2u" | "pdfa-2a" | "pdfa-3b" | "pdfa-3u" | "pdfa-3a";
const {
  APIPublicKey: publicKey,
  APISecretKey: secretKey,
  OpenNow: openNow,
  AskBeforeDownload: askBeforeDownload,
  SelectFileInFinder: selectFileInFinder,
} = getPreferenceValues<Preferences>();

const getConformanceLevelDescription = (conformance: string): string => {
  switch (conformance) {
    case "pdfa-1b":
      return (
        "Based on a PDF 1.4. Level B (basic) conformance with mandatory requirements:\n" +
        "\n" +
        "- Include Embed fonts\n" +
        "- Include Color Management guides\n" +
        "- Include Metadata\n" +
        "- Also a list of forbidden elements"
      );
    case "pdfa-1a":
      return (
        "Based on a PDF 1.4. Level A (accessible) conformance with additional standard requirements:\n" +
        "\n" +
        "- Language specification\n" +
        "- Hierarchical document structure\n" +
        "- Tagged text spans and descriptive text for images and symbols\n" +
        "- Character mappings to Unicode"
      );
    case "pdfa-2b":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level B (basic) conformance requirements plus new features:\n" +
        "\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    case "pdfa-2u":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level B (basic) conformance requirements plus new features:\n" +
        "\n" +
        "- Text has unicode mapping\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    case "pdfa-2a":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level A (accessible) conformance requirements plus new features:\n" +
        "\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    case "pdfa-3b":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level B (basic) conformance. Level B (basic) conformance requirements plus new features:\n" +
        "\n" +
        "- Allows embedding of XML, CSV, CAD, word-processing documents, spreadsheet documents, and other file formats into PDF/A conforming documents\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    case "pdfa-3u":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level B (basic) conformance. Level B (basic) conformance. Level B (basic) conformance requirements plus new features:\n" +
        "\n" +
        "- Text has unicode mapping\n" +
        "- Allows embedding of XML, CSV, CAD, word-processing documents, spreadsheet documents, and other file formats into PDF/A conforming documents\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    case "pdfa-3a":
      return (
        "Based on a PDF 1.7 (ISO 32000-1). Level A (accessible) conformance requirements plus new features:\n" +
        "\n" +
        "- Allows embedding of XML, CSV, CAD, word-processing documents, spreadsheet documents, and other file formats into PDF/A conforming documents\n" +
        "- JPEG 2000 image compression\n" +
        "- Support for transparency effects and layers\n" +
        "- Embedding of OpenType fonts\n" +
        "- Provisions for digital signatures in accordance with the PDF Advanced Electronic Signatures\n" +
        "- The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
      );
    default:
      return "";
  }
};
export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");
  const [conformance, setConformance] = useState<string>("pdfa-2b");
  const [allowDowngrade, setAllowDowngrade] = useState<boolean>(true);
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

    const toast = await showToast(Toast.Style.Animated, "Processing", "Converting to PDF/A...");

    for (const valueFile of values.files) {
      const file: string = valueFile;
      const fileExtension = path.extname(file);
      const fileName = path.basename(file, fileExtension);
      const directory = path.dirname(file);
      let destinationFile = getFilePath(directory, `${fileName}_pdfa.pdf`);

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
      const task = instance.newTask("pdfa") as PdfaTask;

      try {
        await task.start();
        const iLovePdfFile = new ILovePDFFile(file);
        await task.addFile(iLovePdfFile);
        await task.process({ conformance: conformance as ConfromanceLevel, allow_downgrade: allowDowngrade });
        const data = await task.download();
        fs.writeFileSync(destinationFile, data);
        toast.style = Toast.Style.Success;
        toast.title = "success";
        toast.message = "File converted successfully.";
        setStatus("success");
        setIsLoading(false);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "failure";
        toast.message = `Error happened during converting the ${fileName} file. Reason ${error}`;
        setStatus("failure");
        setIsLoading(false);
        console.log(error);
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
          <Action.SubmitForm title="Convert to PDF/A" onSubmit={handleSubmit} />
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
        id="allow_downgrade"
        label=""
        title="Allow Downgrade of PDF/A Compliance Level"
        value={allowDowngrade}
        onChange={setAllowDowngrade}
        info="In order to convert to PDF/A, when certain elements are found in the original PDF, it's possible that a conformance downgrade is needed to be able to perform the conversion"
      />
      <Form.Dropdown id="conformance" title="PDF/A Conformance Level" value={conformance} onChange={setConformance}>
        <Form.Dropdown.Item value="pdfa-1b" title="PDF/A-1b" />
        <Form.Dropdown.Item value="pdfa-1a" title="PDF/A-1a" />
        <Form.Dropdown.Item value="pdfa-2b" title="PDF/A-2b" />
        <Form.Dropdown.Item value="pdfa-2u" title="PDF/A-2u" />
        <Form.Dropdown.Item value="pdfa-2a" title="PDF/A-2a" />
        <Form.Dropdown.Item value="pdfa-3b" title="PDF/A-3b" />
        <Form.Dropdown.Item value="pdfa-3u" title="PDF/A-3u" />
        <Form.Dropdown.Item value="pdfa-3a" title="PDF/A-3a" />
      </Form.Dropdown>
      <Form.Description title="" text={getConformanceLevelDescription(conformance)} />
    </Form>
  );
}
