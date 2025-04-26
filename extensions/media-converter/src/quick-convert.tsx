import { List, ActionPanel, Action, showToast, Toast, getSelectedFinderItems, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { convertVideo, convertImage, convertAudio } from "./utils/converter";
import { execPromise } from "./utils/exec";

// Comprehensive list of allowed file extensions
export const FILE_TYPE_EXTENSIONS = {
  video: [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".m4v", ".webm"],
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".heic", ".avif"],
  audio: [".mp3", ".aac", ".wav", ".m4a", ".flac", ".ogg", ".wma"],
};

// Mapping of file types to conversion formats
const CONVERSION_FORMATS = {
  video: ["mp4", "avi", "mkv", "mov", "mpg", "webm"],
  image: ["jpg", "png", "webp", "heic", "tiff", "avif"],
  audio: ["mp3", "aac", "wav", "flac"],
};

// Mapping of file types to icons
const FILE_TYPE_ICONS = {
  video: Icon.Video,
  image: Icon.Image,
  audio: Icon.Music,
};

export default function QuickConvert() {
  const [selectedFiles, setSelectedFiles] = useState<string[] | null>(null);
  const [fileType, setFileType] = useState<keyof typeof FILE_TYPE_EXTENSIONS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSelectedFiles = async () => {
      try {
        const items = await getSelectedFinderItems();

        if (items.length === 0) {
          setError("No file selected in Finder");
          await showToast({
            style: Toast.Style.Failure,
            title: "No File Selected",
            message: "Please select one or more files in Finder",
          });
          return;
        }

        const files = items.map((item) => item.path);
        const firstExt = path.extname(files[0]).toLowerCase();

        // Determine file type from the first file and ensure all files are of the same type
        let detectedType: keyof typeof FILE_TYPE_EXTENSIONS | null = null;
        (Object.keys(FILE_TYPE_EXTENSIONS) as Array<keyof typeof FILE_TYPE_EXTENSIONS>).forEach((type) => {
          if (FILE_TYPE_EXTENSIONS[type].includes(firstExt)) {
            detectedType = type;
          }
        });

        if (!detectedType) {
          setError("Unsupported file type");
          await showToast({
            style: Toast.Style.Failure,
            title: "Unsupported File Type",
            message: `File extension ${firstExt} is not supported`,
          });
          return;
        }

        const invalidSelection = files.some(
          (file) => !FILE_TYPE_EXTENSIONS[detectedType!].includes(path.extname(file).toLowerCase()),
        );
        if (invalidSelection) {
          setError("Invalid file selection. Please select files of the same type.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Selection",
            message: "Please select only one type of media (video, image, or audio)",
          });
          return;
        }

        setSelectedFiles(files);
        setFileType(detectedType);
        setError(null);
      } catch (err) {
        console.error("Error fetching Finder items:", err);
        setError("Failed to fetch Finder items");
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to fetch Finder items",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSelectedFiles();
  }, []);

  const handleConvert = async (format: string) => {
    if (!selectedFiles || !fileType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Error",
        message: "No files selected or file type not recognized",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting files..." });
    for (const file of selectedFiles) {
      try {
        let outputPath = "";
        switch (fileType) {
          case "image":
            outputPath = await convertImage(file, format as "jpg" | "png" | "webp" | "heic" | "tiff" | "avif");
            break;
          case "audio":
            outputPath = await convertAudio(file, format as "mp3" | "aac" | "wav" | "flac");
            break;
          case "video":
            outputPath = await convertVideo(file, format as "mp4" | "avi" | "mkv" | "mov" | "mpg" | "webm");
            break;
          default:
            throw new Error("Unsupported file type");
        }
        await showToast({
          style: Toast.Style.Success,
          title: "Conversion Successful",
          message: `Converted ${path.basename(file)} to ${format.toUpperCase()}`,
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => execPromise(`open "${outputPath}"`),
          },
        });
      } catch (error) {
        console.error("Conversion error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversion Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await toast.hide();
  };

  if (error) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Error occurred">
        <List.Item title={error} icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a format to convert to">
      {fileType &&
        CONVERSION_FORMATS[fileType].map((format) => (
          <List.Item
            key={format}
            title={`Convert to ${format.toUpperCase()}`}
            icon={FILE_TYPE_ICONS[fileType]}
            actions={
              <ActionPanel>
                <Action
                  title={`Convert to ${format.toUpperCase()}`}
                  onAction={() => handleConvert(format)}
                  icon={FILE_TYPE_ICONS[fileType]}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
