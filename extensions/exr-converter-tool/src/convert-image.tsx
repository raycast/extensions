import {
  showToast,
  Toast,
  getSelectedFinderItems,
  Form,
  ActionPanel,
  Action,
  useNavigation,
  Detail,
  LocalStorage,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { useState } from "react";
import { getImageMetadata } from "./utils";
import { FORMATS, RESIZE_MODES, FILTER_OPTIONS } from "./constants";
import { FormValues } from "./types";
import { useDependencyCheck } from "./hooks";

const execAsync = promisify(exec);

export default function Command() {
  const { pop } = useNavigation();
  const {
    isLoading,
    hasOiiotool,
    hasExiftool,
    selectedFormat,
    setSelectedFormat,
    selectedCompression,
    setSelectedCompression,
    checkDependencies,
  } = useDependencyCheck();

  const [resizeMode, setResizeMode] = useState<string>("none");
  const [compressionLevel, setCompressionLevel] = useState<string>("45");

  if (isLoading) {
    return <Detail markdown="Checking dependencies..." />;
  }

  if (!hasOiiotool) {
    return (
      <Detail
        markdown={`
# OpenImageIO Not Found

This extension requires **OpenImageIO** to convert images.

Please install it using Homebrew:

\`\`\`bash
brew install openimageio
\`\`\`

After installing, try running this command again.
`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="brew install openimageio"
            />
            <Action title="Check Again" onAction={checkDependencies} />
          </ActionPanel>
        }
      />
    );
  }

  if (!hasExiftool) {
    return (
      <Detail
        markdown={`
# ExifTool Not Found

This extension requires **ExifTool** to process RAW images.

Please install it using Homebrew:

\`\`\`bash
brew install exiftool
\`\`\`

After installing, try running this command again.
`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="brew install exiftool"
            />
            <Action title="Check Again" onAction={checkDependencies} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    try {
      const items = await getSelectedFinderItems();

      if (items.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files selected",
          message: "Please select image files in Finder",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Converting images...",
        message: `${items.length} file(s) selected`,
      });

      for (const item of items) {
        const inputPath = item.path;
        const parsedPath = path.parse(inputPath);

        // Get metadata for resizing calculations
        const metadata = await getImageMetadata(inputPath);
        let targetWidth = metadata.width;
        let targetHeight = metadata.height;
        let resizeArgs = "";

        // Calculate new dimensions
        if (values.resizeMode !== "none" && values.resizeValue) {
          const val = parseFloat(values.resizeValue);
          if (!isNaN(val)) {
            if (values.resizeMode === "scale") {
              const scale = val / 100;
              targetWidth = Math.round(metadata.width * scale);
              targetHeight = Math.round(metadata.height * scale);
              resizeArgs = `--resize:filter=${values.resizeFilter} ${targetWidth}x${targetHeight}`;
            } else if (values.resizeMode === "width") {
              targetWidth = Math.round(val);
              targetHeight = Math.round(
                metadata.height * (targetWidth / metadata.width),
              );
              resizeArgs = `--resize:filter=${values.resizeFilter} ${targetWidth}x0`;
            } else if (values.resizeMode === "height") {
              targetHeight = Math.round(val);
              targetWidth = Math.round(
                metadata.width * (targetHeight / metadata.height),
              );
              resizeArgs = `--resize:filter=${values.resizeFilter} 0x${targetHeight}`;
            } else if (values.resizeMode === "fit") {
              // Fit within box (Set Longest Side)
              const ratio = Math.min(
                val / metadata.width,
                val / metadata.height,
              );
              targetWidth = Math.round(metadata.width * ratio);
              targetHeight = Math.round(metadata.height * ratio);
              resizeArgs = `--resize:filter=${values.resizeFilter} ${targetWidth}x${targetHeight}`;
            }
          }
        }

        // Determine output filename
        let filename = parsedPath.name;
        if (values.addSuffix) {
          filename += `_${values.compression.replace(/:/g, "-")}`;
        }
        if (values.addResolutionSuffix) {
          filename += `_${targetWidth}x${targetHeight}`;
        }

        const outputExtension = `.${values.format}`;
        const outputPath = path.join(
          parsedPath.dir,
          `${filename}${outputExtension}`,
        );

        // Construct oiiotool command
        // oiiotool <input> [resize] -compression <type> -o <output>
        // Note: For JPG, compression usually maps to quality, but oiiotool uses -compression jpeg.
        // If we wanted to control quality we'd use --quality <n> but for now we stick to compression types.
        let compressionArg = "";
        if (values.compression !== "none") {
          compressionArg = `-compression ${values.compression}`;

          // Append compression level for DWAA/DWAB if specified
          if (
            values.format === "exr" &&
            (values.compression === "dwaa" || values.compression === "dwab")
          ) {
            const level = parseFloat(values.compressionLevel || "45");
            if (!isNaN(level)) {
              compressionArg += `:${level}`;
            }
          }
        }

        let outputArg = `-o "${outputPath}"`;
        if (values.format === "tx") {
          outputArg = `-otex "${outputPath}"`;
        }

        // Handle Color Space Conversion for DNG (RAW) -> sRGB formats
        // DNGs are typically linear, so we need to convert to sRGB for display formats.

        const isOutputSrgb = ["jpg", "png", "tiff", "webp", "heic"].includes(
          values.format,
        );

        const isInputRaw = [
          ".cr3",
          ".cr2",
          ".dng",
          ".nef",
          ".arw",
          ".raf",
          ".orf",
          ".rw2",
        ].includes(parsedPath.ext.toLowerCase());

        let command = "";

        if (isInputRaw) {
          // Use exiftool to extract embedded JPEG from RAW files
          // Step 1: Extract JpgFromRaw to output path
          // Step 2: Set Orientation=1 on the OUTPUT file (not input) to ensure it displays correctly
          // We chain these commands.
          const extractCommand = `exiftool -b -JpgFromRaw "${inputPath}" > "${outputPath}"`;
          const orientCommand = `exiftool -orientation=1 -overwrite_original "${outputPath}"`;
          command = `${extractCommand} && ${orientCommand}`;
        } else {
          // Standard OIIO conversion for non-RAW files
          let bitDepthArg = "";
          const colorConvertArg = "";

          if (isOutputSrgb) {
            // Ensure 8-bit output for sRGB formats (standard for display)
            bitDepthArg = "-d uint8";
          }

          command = `oiiotool "${inputPath}" ${resizeArgs} ${colorConvertArg} ${bitDepthArg} ${compressionArg} ${outputArg}`;
        }

        try {
          await execAsync(command, {
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:${process.env.PATH}`,
            },
          });
        } catch (e: unknown) {
          const error = e as { stderr?: string; message?: string };
          const errorMessage = error.stderr || error.message || "Unknown error";

          // Check for common dependency/library issues
          if (
            errorMessage.includes("Library not loaded") ||
            errorMessage.includes("dyld")
          ) {
            throw new Error(
              `OpenImageIO dependency issue detected. Please reinstall OpenImageIO:\n\nbrew reinstall openimageio\n\nOriginal error: ${errorMessage}`,
            );
          }

          throw new Error(
            `Failed to convert ${parsedPath.base}: ${errorMessage}`,
          );
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Conversion complete",
        message: `Converted ${items.length} file(s) to ${FORMATS[values.format].title}`,
      });

      pop(); // Close the form after success
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Images" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="format"
        title="Output Format"
        value={selectedFormat}
        onChange={(newValue) => {
          setSelectedFormat(newValue);
          LocalStorage.setItem("selectedFormat", newValue);
          if (FORMATS[newValue]) {
            const defaultCompression = FORMATS[newValue].compressions[0].value;
            setSelectedCompression(defaultCompression);
            LocalStorage.setItem("selectedCompression", defaultCompression);
          }
        }}
      >
        {Object.entries(FORMATS).map(([key, format]) => (
          <Form.Dropdown.Item key={key} value={key} title={format.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="compression"
        title="Compression"
        value={selectedCompression}
        onChange={(newValue) => {
          setSelectedCompression(newValue);
          LocalStorage.setItem("selectedCompression", newValue);
        }}
      >
        {FORMATS[selectedFormat].compressions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      {selectedFormat === "exr" &&
        (selectedCompression === "dwaa" || selectedCompression === "dwab") && (
          <Form.Dropdown
            id="compressionLevel"
            title="Compression Level"
            value={compressionLevel}
            onChange={setCompressionLevel}
            info="Lower values = higher quality, larger file size. Default is 45."
          >
            <Form.Dropdown.Item value="10" title="10 (High Quality)" />
            <Form.Dropdown.Item value="20" title="20" />
            <Form.Dropdown.Item value="30" title="30" />
            <Form.Dropdown.Item value="40" title="40" />
            <Form.Dropdown.Item value="45" title="45 (Default)" />
            <Form.Dropdown.Item value="50" title="50" />
            <Form.Dropdown.Item value="60" title="60" />
            <Form.Dropdown.Item value="70" title="70" />
            <Form.Dropdown.Item value="80" title="80" />
            <Form.Dropdown.Item value="90" title="90" />
            <Form.Dropdown.Item value="100" title="100 (Low Quality)" />
          </Form.Dropdown>
        )}

      <Form.Separator />

      <Form.Dropdown
        id="resizeMode"
        title="Resize Mode"
        value={resizeMode}
        onChange={setResizeMode}
      >
        {RESIZE_MODES.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            value={mode.value}
            title={mode.title}
          />
        ))}
      </Form.Dropdown>

      {resizeMode !== "none" && (
        <>
          <Form.TextField
            id="resizeValue"
            title="Value"
            placeholder="Percentage or Pixels"
          />

          <Form.Dropdown
            id="resizeFilter"
            title="Filter"
            defaultValue="lanczos3"
          >
            {FILTER_OPTIONS.map((filter) => (
              <Form.Dropdown.Item
                key={filter.value}
                value={filter.value}
                title={filter.title}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      <Form.Separator />

      <Form.Checkbox
        id="addSuffix"
        label="Add Compression Type to File Name"
        defaultValue={false}
      />
      <Form.Checkbox
        id="addResolutionSuffix"
        label="Add Resolution to File Name"
        defaultValue={false}
      />
    </Form>
  );
}
