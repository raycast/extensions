import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  open,
  showInFinder,
  LaunchProps,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import got from "got";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import os from "os";
import { TargetLanguage, target_languages, Formality, delayedCloseWindow, isPro, gotErrorToString } from "./utils";

type DownloadLocation = "same" | "downloads" | "documents" | "desktop" | "custom";

interface DocumentTranslationValues {
  document?: string[];
  targetLanguage?: TargetLanguage;
  sourceLanguage?: string;
  formality?: Formality;
  outputFormat?: string;
  downloadLocation?: DownloadLocation;
  customDownloadPath?: string[];
}

const SUPPORTED_FORMATS = ["docx", "doc", "pptx", "xlsx", "pdf", "htm", "html", "txt", "xlf", "xliff", "srt"];

const OUTPUT_FORMATS = [
  { value: "", title: "Same as input" },
  { value: "docx", title: "Microsoft Word (DOCX)" },
];

interface DocumentUploadResponse {
  document_id: string;
  document_key: string;
}

interface DocumentStatusResponse {
  document_id: string;
  status: "queued" | "translating" | "done" | "error";
  seconds_remaining?: number;
  billed_characters?: number;
  message?: string;
}

async function uploadDocument(
  filePath: string,
  targetLanguage: TargetLanguage,
  sourceLanguage?: string,
  formality?: Formality,
  outputFormat?: string,
): Promise<DocumentUploadResponse> {
  const prefs = getPreferenceValues<Preferences>();
  const { key } = prefs;

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("target_lang", targetLanguage);

  if (sourceLanguage) {
    form.append("source_lang", sourceLanguage);
  }

  if (formality && formality !== "default") {
    form.append("formality", formality);
  }

  if (outputFormat) {
    form.append("output_format", outputFormat);
  }

  const response = await got.post(`https://api${isPro(key) ? "" : "-free"}.deepl.com/v2/document`, {
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  return JSON.parse(response.body) as DocumentUploadResponse;
}

async function checkDocumentStatus(documentId: string, documentKey: string): Promise<DocumentStatusResponse> {
  const prefs = getPreferenceValues<Preferences>();
  const { key } = prefs;

  const response = await got.post(`https://api${isPro(key) ? "" : "-free"}.deepl.com/v2/document/${documentId}`, {
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    json: {
      document_key: documentKey,
    },
  });

  return JSON.parse(response.body) as DocumentStatusResponse;
}

function getDownloadPath(
  location: string,
  customPath: string | undefined,
  originalPath: string,
  customFolder?: string[],
): string {
  const originalName = path.basename(originalPath, path.extname(originalPath));
  const originalExt = path.extname(originalPath);
  const fileName = `${originalName}_translated${originalExt}`;

  switch (location) {
    case "same":
      return path.join(path.dirname(originalPath), fileName);
    case "downloads":
      return path.join(os.homedir(), "Downloads", fileName);
    case "documents":
      return path.join(os.homedir(), "Documents", fileName);
    case "desktop":
      return path.join(os.homedir(), "Desktop", fileName);
    case "custom":
      if (customFolder && customFolder.length > 0) {
        return path.join(customFolder[0], fileName);
      } else if (customPath && customPath.trim()) {
        return path.join(customPath.trim(), fileName);
      } else {
        return path.join(os.homedir(), "Downloads", fileName);
      }
    default:
      return path.join(path.dirname(originalPath), fileName);
  }
}

async function downloadDocument(
  documentId: string,
  documentKey: string,
  originalPath: string,
  downloadLocation: string,
  customPath?: string,
  customFolder?: string[],
): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const { key } = prefs;

  const response = await got.post(
    `https://api${isPro(key) ? "" : "-free"}.deepl.com/v2/document/${documentId}/result`,
    {
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      json: {
        document_key: documentKey,
      },
      responseType: "buffer",
    },
  );

  const outputPath = getDownloadPath(downloadLocation, customPath, originalPath, customFolder);

  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, new Uint8Array(response.body));
  return outputPath;
}

async function translateDocument(values: DocumentTranslationValues): Promise<void> {
  if (!values.document || values.document.length === 0 || !values.targetLanguage) {
    await showToast(Toast.Style.Failure, "Please select a document and target language");
    return;
  }

  const filePath = values.document[0];
  const fileExt = path.extname(filePath).toLowerCase().replace(".", "");

  if (!SUPPORTED_FORMATS.includes(fileExt)) {
    await showToast(
      Toast.Style.Failure,
      "Unsupported file format",
      `Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
    );
    return;
  }

  // Check if file exists and is readable
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 40 * 1024 * 1024) {
      await showToast(Toast.Style.Failure, "File too large", "Maximum file size is 40MB");
      return;
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "File not accessible", "Please ensure the file exists and is readable");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Uploading document...");

  try {
    // Step 1: Upload document
    const uploadResponse = await uploadDocument(
      filePath,
      values.targetLanguage,
      values.sourceLanguage,
      values.formality,
      values.outputFormat,
    );

    toast.style = Toast.Style.Animated;
    toast.title = "Translating document...";
    toast.message = "Please wait while your document is being translated";

    let status: DocumentStatusResponse | undefined;
    let attempts = 0;
    const maxAttempts = 180;

    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        status = await checkDocumentStatus(uploadResponse.document_id, uploadResponse.document_key);
      } catch (error) {
        if (attempts++ > 3) {
          throw new Error("Failed to check translation status after multiple attempts");
        }
        continue;
      }

      if (status?.seconds_remaining && status.seconds_remaining > 0) {
        const minutes = Math.ceil(status.seconds_remaining / 60);
        toast.message = `Estimated time remaining: ${minutes > 1 ? `${minutes} min` : `${status.seconds_remaining}s`}`;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Translation timeout - document took too long to process");
      }
    } while (!status || status.status === "queued" || status.status === "translating");

    if (!status) {
      throw new Error("Failed to get translation status");
    }

    if (status.status === "error") {
      throw new Error(status.message || "Translation failed");
    }

    toast.title = "Downloading translated document...";
    toast.message = "";

    const prefs = getPreferenceValues<Preferences>();
    const downloadLocation = values.downloadLocation || prefs.defaultDownloadLocation || "same";

    const translatedPath = await downloadDocument(
      uploadResponse.document_id,
      uploadResponse.document_key,
      filePath,
      downloadLocation,
      prefs.customDownloadPath,
      values.customDownloadPath,
    );

    toast.style = Toast.Style.Success;
    toast.title = "Document translated successfully!";
    const fileSize = status.billed_characters ? `(${status.billed_characters} characters billed)` : "";
    toast.message = `Saved to: ${path.basename(translatedPath)} ${fileSize}`;

    toast.primaryAction = {
      title: "Open Document",
      onAction: () => open(translatedPath),
    };

    toast.secondaryAction = {
      title: "Show in Finder",
      onAction: () => showInFinder(translatedPath),
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Translation failed";
    toast.message = gotErrorToString(error);
  }
}

const DocumentTranslateCommand = (props: LaunchProps) => {
  const { defaultTargetLanguage, closeRaycastAfterTranslation, defaultFormality } = getPreferenceValues<Preferences>();

  const [loading, setLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(defaultTargetLanguage);
  const [formality, setFormality] = useState<Formality>(defaultFormality ?? "default");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [autoDetected, setAutoDetected] = useState<boolean>(false);
  const [downloadLocation, setDownloadLocation] = useState<DownloadLocation>("same");
  const [customDownloadPath, setCustomDownloadPath] = useState<string>("");

  useEffect(() => {
    const initializeFiles = async () => {
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          const supportedFiles = finderItems
            .filter((item) => !item.path.endsWith("/"))
            .map((item) => item.path)
            .filter((filePath) => {
              const fileExt = path.extname(filePath).toLowerCase().replace(".", "");
              return SUPPORTED_FORMATS.includes(fileExt);
            });

          if (supportedFiles.length > 0) {
            setSelectedFiles([supportedFiles[0]]);
            setAutoDetected(true);
          }
        }
      } catch (error) {
        if (props.fallbackText && (props.fallbackText.includes("/") || props.fallbackText.includes("\\"))) {
          const potentialPath = props.fallbackText.trim();
          const fileExt = path.extname(potentialPath).toLowerCase().replace(".", "");
          if (SUPPORTED_FORMATS.includes(fileExt)) {
            try {
              await fs.promises.access(potentialPath, fs.constants.R_OK);
              setSelectedFiles([potentialPath]);
              setAutoDetected(true);
            } catch {
              // File doesn't exist or isn't accessible
            }
          }
        }
      }
    };

    initializeFiles();
  }, [props.fallbackText]);

  const handleFileChange = useCallback((files: string[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setAutoDetected(false);
    }
  }, []);

  const submit = useCallback(
    async (values: DocumentTranslationValues) => {
      setLoading(true);

      // Combine form values with state values
      const combinedValues = {
        ...values,
        downloadLocation: downloadLocation,
        customDownloadPath: downloadLocation === "custom" && customDownloadPath ? [customDownloadPath] : undefined,
      };

      await translateDocument(combinedValues);
      setLoading(false);
      await delayedCloseWindow(closeRaycastAfterTranslation);
    },
    [closeRaycastAfterTranslation, downloadLocation, customDownloadPath],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate Document" onSubmit={submit} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Get Free Api Key" url="https://www.deepl.com/pro-api" />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={loading}
    >
      <Form.FilePicker
        id="document"
        title="Document"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={selectedFiles}
        onChange={handleFileChange}
      />

      <Form.Dropdown
        id="targetLanguage"
        value={targetLanguage}
        onChange={(value) => setTargetLanguage(value as TargetLanguage)}
        title="Target Language"
      >
        {Object.entries(target_languages).map(([value, title]) => (
          <Form.Dropdown.Item value={value} title={title} key={value} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="sourceLanguage" title="Source Language (Optional)" storeValue={true}>
        <Form.Dropdown.Item value="" title="Auto-detect" />
        <Form.Dropdown.Item value="AR" title="Arabic" />
        <Form.Dropdown.Item value="BG" title="Bulgarian" />
        <Form.Dropdown.Item value="ZH" title="Chinese" />
        <Form.Dropdown.Item value="CS" title="Czech" />
        <Form.Dropdown.Item value="DA" title="Danish" />
        <Form.Dropdown.Item value="NL" title="Dutch" />
        <Form.Dropdown.Item value="EN" title="English" />
        <Form.Dropdown.Item value="ET" title="Estonian" />
        <Form.Dropdown.Item value="FI" title="Finnish" />
        <Form.Dropdown.Item value="FR" title="French" />
        <Form.Dropdown.Item value="DE" title="German" />
        <Form.Dropdown.Item value="EL" title="Greek" />
        <Form.Dropdown.Item value="HU" title="Hungarian" />
        <Form.Dropdown.Item value="IT" title="Italian" />
        <Form.Dropdown.Item value="JA" title="Japanese" />
        <Form.Dropdown.Item value="LV" title="Latvian" />
        <Form.Dropdown.Item value="LT" title="Lithuanian" />
        <Form.Dropdown.Item value="PL" title="Polish" />
        <Form.Dropdown.Item value="PT" title="Portuguese" />
        <Form.Dropdown.Item value="RO" title="Romanian" />
        <Form.Dropdown.Item value="RU" title="Russian" />
        <Form.Dropdown.Item value="SK" title="Slovak" />
        <Form.Dropdown.Item value="SL" title="Slovenian" />
        <Form.Dropdown.Item value="ES" title="Spanish" />
        <Form.Dropdown.Item value="SV" title="Swedish" />
        <Form.Dropdown.Item value="UK" title="Ukrainian" />
        <Form.Dropdown.Item value="ID" title="Indonesian" />
        <Form.Dropdown.Item value="KO" title="Korean" />
        <Form.Dropdown.Item value="NB" title="Norwegian" />
        <Form.Dropdown.Item value="TR" title="Turkish" />
      </Form.Dropdown>

      <Form.Dropdown
        id="formality"
        value={formality}
        onChange={(value) => setFormality(value as Formality)}
        title="Formality"
      >
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="prefer_more" title="More Formal" />
        <Form.Dropdown.Item value="prefer_less" title="Less Formal" />
      </Form.Dropdown>

      <Form.Dropdown id="outputFormat" title="Output Format" storeValue={true}>
        {OUTPUT_FORMATS.map(({ value, title }) => (
          <Form.Dropdown.Item value={value} title={title} key={value || "default"} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="downloadLocation"
        value={downloadLocation}
        onChange={(value) => setDownloadLocation(value as DownloadLocation)}
        title="Download Location"
      >
        <Form.Dropdown.Item value="same" title="Same folder as original" />
        <Form.Dropdown.Item value="downloads" title="Downloads folder" />
        <Form.Dropdown.Item value="documents" title="Documents folder" />
        <Form.Dropdown.Item value="desktop" title="Desktop" />
        <Form.Dropdown.Item value="custom" title="Custom folder..." />
      </Form.Dropdown>

      {downloadLocation === "custom" && (
        <Form.FilePicker
          id="customDownloadPath"
          value={customDownloadPath ? [customDownloadPath] : []}
          onChange={(paths) => setCustomDownloadPath(paths[0] || "")}
          title="Custom Download Folder"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
        />
      )}

      <Form.Description title="Supported Formats" text={`${SUPPORTED_FORMATS.join(", ")}`} />

      {selectedFiles.length > 0 && autoDetected && (
        <Form.Description
          title="Auto-detected File"
          text={`Selected file from Finder: ${path.basename(selectedFiles[0])}`}
        />
      )}
    </Form>
  );
};

export default DocumentTranslateCommand;
