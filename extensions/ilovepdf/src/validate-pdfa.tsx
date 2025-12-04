import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
  useNavigation,
  Detail,
  popToRoot,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import ValidatePdfaTask from "@ilovepdf/ilovepdf-js-core/tasks/ValidatePdfaTask";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { ReactNode, useState } from "react";
import { Status } from "./common/types";

type Values = {
  files: string[];
};
type ConformanceLevel = "pdfa-1b" | "pdfa-1a" | "pdfa-2b" | "pdfa-2u" | "pdfa-2a" | "pdfa-3b" | "pdfa-3u" | "pdfa-3a";
type ValidationOutput = {
  status: string;
  reason?: string[];
  error?: string;
};
const { APIPublicKey: publicKey, APISecretKey: secretKey } = getPreferenceValues<Preferences>();

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
  const [conformance, setConformance] = useState<string>("pdfa-2b");
  const [validation, setValidation] = useState<ValidationOutput>({ status: "" });

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    if (!values.files.length) {
      await showToast(Toast.Style.Failure, "You must select a single file.", "Please select a file.");
      setStatus("failure");
      setIsLoading(false);
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Processing", "Validating PDF/A...");

    const file: string = values.files[0];
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("validatepdfa") as ValidatePdfaTask;

    try {
      await task.start();
      const iLovePdfFile = new ILovePDFFile(file);
      await task.addFile(iLovePdfFile);
      const { validations }: { validations: ValidationOutput[] } = await task.process({
        conformance: conformance as ConformanceLevel,
      });

      if (!validations.length || (validations[0].status != "Conformant" && validations[0].status != "NonConformant")) {
        throw new Error("Received empty validations from the server");
      }

      setValidation(validations[0]);
      toast.style = Toast.Style.Success;
      toast.title = "success";
      toast.message =
        validations[0].status == "Conformant" ? "File is a validated PDF/A." : "File is an invalidated PDF/A.";
      setStatus("success");
      setIsLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "failure";
      toast.message = `Error happened during validating the file. Reason ${error}`;
      setStatus("failure");
      setStatus("failure");
      setIsLoading(false);
      console.log(error);
      return;
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Validate PDF/A" onSubmit={handleSubmit} />
          {status == "success" ? (
            <Action.Push
              title="Show Validation Details"
              target={
                <Outcome validation={validation} conformance={conformance as ConformanceLevel} setStatus={setStatus} />
              }
            />
          ) : null}

          {status == "failure" ? (
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.FilePicker id="files" title="Choose a PDF" allowMultipleSelection={false} />

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

function Outcome(props: {
  validation: ValidationOutput;
  conformance: ConformanceLevel;
  setStatus: (status: Status) => void;
}): ReactNode {
  const { pop } = useNavigation();
  const reasons = props.validation.reason ?? [];
  // format is "num, num , hexa, message, num"
  const reasonMessage = reasons
    .map((reason) => {
      const parts = reason.split(",");
      return parts.length >= 4 ? parts[3] : "";
    })
    .filter((reason) => {
      return reason.length;
    })
    .map((reason) => {
      return `- ${reason}`;
    })
    .join("\n");
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            title="Start Over"
            onAction={() => {
              props.setStatus("init");
              pop();
            }}
          />
          <Action
            title="Exit"
            onAction={() => {
              popToRoot();
            }}
          />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      markdown={`Validation outcome of your file against ${props.conformance}: ${props.validation.status == "NonConformant" ? "invalid" : "valid"}\n${
        props.validation.status == "NonConformant" && reasonMessage.length ? "\nReason(s):\n" + reasonMessage : ""
      }`}
    />
  );
}
