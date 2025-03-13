import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  SubmitFormAction,
  getPreferenceValues,
  showToast,
  Toast,
  Detail,
  Icon,
  Action,
  open,
  getSelectedFinderItems,
} from "@raycast/api";
import { removeBackgroundFromImageFile } from "remove.bg";
import { existsSync } from "fs";
import path from "path";
import { homedir } from "os";
import { Action$ } from "raycast-toolkit";

interface Preferences {
  apiKey: string;
  cropToContent: boolean;
  fileNameModifier: string;
  filenameFormat: string;
  defaultSize: string;
  defaultFormat: string;
  defaultType: string;
}

interface FormValues {
  filePath: string;
  size: string;
  format: string;
  crop: boolean;
  saveLocation: string;
  outputFolder: string;
  filenameFormat: string;
  filenameModifier: string;
  type: string;
}

interface ProcessedFile {
  inputPath: string;
  outputPath: string;
  base64img?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [filePath, setFilePath] = useState("");
  const [result, setResult] = useState<ProcessedFile[]>([]);
  const [saveLocation, setSaveLocation] = useState<string>("same");
  const [filenameFormat, setFilenameFormat] = useState<string>("nochange");
  const [filenameModifier, setFilenameModifier] = useState<string>("");
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    fetchSelectedFiles();

    // Set default values from preferences
    setSaveLocation("desktop");

    // Set default filename format from preferences
    setFilenameFormat(preferences.filenameFormat || "nochange");
    setFilenameModifier(preferences.fileNameModifier || "");
  }, []);

  // Function to fetch selected files from Finder
  async function fetchSelectedFiles() {
    try {
      const files = await getSelectedFinderItems();
      const selectedPaths = files.map((file) => file.path);

      // Filter to only include image files
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
      const imagePaths = selectedPaths.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });

      if (imagePaths.length > 0) {
        setFilePaths(imagePaths);
        setFilePath(imagePaths[0]); // Set the first file as default
      }
    } catch (error) {
      console.error("Error fetching selected files:", error);
    }
  }

  async function handleSubmit(values: FormValues) {
    // If no files are selected, check if manual path was entered
    const filesToProcess = filePaths.length > 0 ? filePaths : [values.filePath];

    if (
      filesToProcess.length === 0 ||
      (filesToProcess.length === 1 && !existsSync(filesToProcess[0]))
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid files to process",
        message: "Please select files in Finder or enter a valid file path",
      });
      return;
    }

    setIsLoading(true);
    const processedFiles: ProcessedFile[] = [];

    try {
      for (const inputFilePath of filesToProcess) {
        if (!existsSync(inputFilePath)) {
          console.warn(`File does not exist: ${inputFilePath}`);
          continue;
        }

        const fileName = path.basename(inputFilePath);
        const fileExt = path.extname(fileName);
        const fileNameWithoutExt = path.basename(fileName, fileExt);
        let outputName;

        // Determine output filename based on format
        switch (values.filenameFormat) {
          case "nochange":
            outputName = fileName;
            break;
          case "append":
            outputName = `${fileNameWithoutExt}${values.filenameModifier || ""}${fileExt}`;
            break;
          case "prepend":
            outputName = `${values.filenameModifier || ""}${fileName}`;
            break;
          default:
            outputName = fileName;
        }

        // Determine output directory based on save location
        let outputDir;
        switch (values.saveLocation) {
          case "same":
            outputDir = path.dirname(inputFilePath);
            break;
          case "desktop":
            outputDir = path.join(homedir(), "Desktop");
            break;
          case "downloads":
            outputDir = path.join(homedir(), "Downloads");
            break;
          case "custom":
            if (values.outputFolder && values.outputFolder.trim() !== "") {
              outputDir = values.outputFolder.trim();
            } else {
              outputDir = path.join(homedir(), "Desktop");
            }
            break;
          default:
            outputDir = path.join(homedir(), "Desktop");
        }

        if (!existsSync(outputDir)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Output folder does not exist",
            message: `Folder not found: ${outputDir}`,
          });
          setIsLoading(false);
          return;
        }

        const outputPath = path.join(outputDir, outputName);
        console.log(`Processing file: ${inputFilePath}`);
        console.log(`Output path: ${outputPath}`);

        // Create an options object for the API call
        // Fix 1: Ensure format is properly typed for the remove.bg API
        const format = (values.format || preferences.defaultFormat || "png") as
          | "png"
          | "jpg"
          | "zip"
          | "auto";

        const options = {
          path: inputFilePath,
          apiKey: preferences.apiKey,
          size: values.size || preferences.defaultSize || "auto",
          outputFile: outputPath,
          type: values.type || preferences.defaultType || "auto",
          type_level: "latest", // Always use latest as requested
          crop: values.crop,
          format: format,
        };

        console.log("API options:", JSON.stringify(options, null, 2));

        try {
          const response = await removeBackgroundFromImageFile(options);
          console.log("API response received");

          processedFiles.push({
            inputPath: inputFilePath,
            outputPath: outputPath,
            base64img: response.base64img,
          });
        } catch (error) {
          console.error(`Error processing file ${inputFilePath}:`, error);
          await showToast({
            style: Toast.Style.Failure,
            title: `Failed to process ${fileName}`,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (processedFiles.length > 0) {
        setResult(processedFiles);
        await showToast({
          style: Toast.Style.Success,
          title: `Processed ${processedFiles.length} file(s)`,
          message: `Saved to ${path.dirname(processedFiles[0].outputPath)}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files were processed successfully",
          message: "Please check your API key and file paths",
        });
      }
    } catch (error) {
      console.error("General error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process images",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (result && result.length > 0) {
    // Create a preview of processed images
    const markdown = result
      .map((file, index) => {
        return `
### Image ${index + 1}: ${path.basename(file.inputPath)}
![Processed Image](data:image/png;base64,${file.base64img})
      `;
      })
      .join("\n\n");

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Open Output Folder"
              icon={Icon.Finder}
              onAction={() => {
                const dir = path.dirname(result[0].outputPath);
                open(dir);
              }}
            />
            <Action
              title="New Background Removal"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setResult([]);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle={isLoading ? "🫥 Processing your image..." : "remove.bg+"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Remove Background" onSubmit={handleSubmit} />
          <Action$.SelectFile
            icon={Icon.Finder}
            title="Select Image From Finder..."
            prompt="Please select an image"
            type="public.image"
            shortcut={{ key: "o", modifiers: ["cmd"] }}
            onSelect={(selectedPath) => {
              // Fix 2: Handle the potentially null selectedPath
              if (selectedPath) {
                setFilePath(selectedPath);
                setFilePaths([selectedPath]);
              }
            }}
          />
        </ActionPanel>
      }
    >
      {filePaths.length > 0 ? (
        <Form.Description
          title="Selected Files"
          text={`${filePaths.length} file(s) selected${
            filePaths.length === 1 ? `: ${path.basename(filePaths[0])}` : ""
          }`}
        />
      ) : (
        <Form.TextField
          id="filePath"
          title="Image File Path"
          placeholder="Enter path to image file, select in Finder, or press ⌘O"
          value={filePath}
          onChange={setFilePath}
        />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="size"
        title="Output Resolution"
        defaultValue={preferences.defaultSize || "auto"}
      >
        <Form.Dropdown.Item value="preview" title="Preview (0.25 MP)" />
        <Form.Dropdown.Item value="auto" title="Auto (Up to 25 MP)" />
        <Form.Dropdown.Item value="full" title="Full (Up to 25 MP)" />
        <Form.Dropdown.Item value="50MP" title="50MP (Up to 50 MP)" />
      </Form.Dropdown>

      <Form.Dropdown
        id="type"
        title="Object Type to Extract"
        defaultValue={preferences.defaultType || "auto"}
      >
        <Form.Dropdown.Item value="auto" title="Auto (Detect Automatically)" />
        <Form.Dropdown.Item value="person" title="Person" />
        <Form.Dropdown.Item value="product" title="Product" />
        <Form.Dropdown.Item value="car" title="Car" />
        <Form.Dropdown.Item value="animal" title="Animal" />
        <Form.Dropdown.Item value="graphic" title="Graphic" />
        <Form.Dropdown.Item value="transportation" title="Transportation" />
      </Form.Dropdown>

      <Form.Dropdown
        id="format"
        title="Output Format"
        defaultValue={preferences.defaultFormat || "png"}
      >
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="jpg" title="JPG" />
        <Form.Dropdown.Item value="zip" title="ZIP (PNG + Mask)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="crop"
        label="Crop Image to Content"
        defaultValue={preferences.cropToContent || false}
      />

      <Form.Separator />

      <Form.Dropdown
        id="saveLocation"
        title="Save Location"
        value={saveLocation}
        onChange={setSaveLocation}
      >
        <Form.Dropdown.Item value="same" title="Same Folder as Input" />
        <Form.Dropdown.Item value="desktop" title="Desktop" />
        <Form.Dropdown.Item value="downloads" title="Downloads" />
        <Form.Dropdown.Item value="custom" title="Choose Folder..." />
      </Form.Dropdown>

      {saveLocation === "custom" && (
        <Form.TextField
          id="outputFolder"
          title="Output Folder"
          placeholder="Enter path to output folder"
        />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="filenameFormat"
        title="Filename Format"
        value={filenameFormat}
        onChange={setFilenameFormat}
      >
        <Form.Dropdown.Item value="nochange" title="No Change" />
        <Form.Dropdown.Item value="prepend" title="Prepend Text" />
        <Form.Dropdown.Item value="append" title="Append Text" />
      </Form.Dropdown>

      {(filenameFormat === "append" || filenameFormat === "prepend") && (
        <Form.TextField
          id="filenameModifier"
          title={filenameFormat === "append" ? "Text to Append" : "Text to Prepend"}
          placeholder={filenameFormat === "append" ? "-nobg" : "nobg-"}
          value={filenameModifier}
          onChange={setFilenameModifier}
        />
      )}
    </Form>
  );
}
