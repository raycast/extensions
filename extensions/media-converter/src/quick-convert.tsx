import { List, ActionPanel, Action, showToast, Toast, getSelectedFinderItems, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { convertVideo, convertImage, convertAudio } from "./utils/converter";
import { execPromise } from "./utils/exec";

// Comprehensive list of allowed file extensions
const FILE_TYPE_EXTENSIONS = {
  video: [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".m4v", ".webm"],
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".heic"],
  audio: [".mp3", ".aac", ".wav", ".m4a", ".flac", ".ogg", ".wma"],
};

// Mapping of file types to conversion formats
const CONVERSION_FORMATS = {
  video: ["mp4", "avi", "mkv", "mov", "mpg", "webm"],
  image: ["jpg", "png", "webp", "heic", "tiff"],
  audio: ["mp3", "aac", "wav", "flac"],
};

// Mapping of file types to icons
const FILE_TYPE_ICONS = {
  video: Icon.Video,
  image: Icon.Image,
  audio: Icon.Music,
};

export default function QuickConvert() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<keyof typeof FILE_TYPE_EXTENSIONS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSelectedFile = async () => {
      try {
        const items = await getSelectedFinderItems();

        // Validate file selection
        if (items.length === 0) {
          setError("No file selected in Finder");
          await showToast({
            style: Toast.Style.Failure,
            title: "No File Selected",
            message: "Please select a file in Finder",
          });
          return;
        }

        const filePath = items[0].path;
        const ext = path.extname(filePath).toLowerCase();

        // Determine file type
        let detectedType: keyof typeof FILE_TYPE_EXTENSIONS | null = null;
        (Object.keys(FILE_TYPE_EXTENSIONS) as Array<keyof typeof FILE_TYPE_EXTENSIONS>).forEach((type) => {
          if (FILE_TYPE_EXTENSIONS[type].includes(ext)) {
            detectedType = type;
          }
        });

        if (!detectedType) {
          setError("Unsupported file type");
          await showToast({
            style: Toast.Style.Failure,
            title: "Unsupported File Type",
            message: `File extension ${ext} is not supported`,
          });
          return;
        }

        setFileType(detectedType);
        setSelectedFile(filePath);
        setError(null);
      } catch (error) {
        console.error("Error fetching Finder items:", error);
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

    fetchSelectedFile();
  }, []);

  const handleConvert = async (format: string) => {
    // Additional validation
    if (!selectedFile || !fileType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Error",
        message: "No file selected or file type not recognized",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting file..." });

    try {
      let outputPath = "";
      switch (fileType) {
        case "image":
          outputPath = await convertImage(selectedFile, format as "jpg" | "png" | "webp" | "heic" | "tiff");
          break;
        case "audio":
          outputPath = await convertAudio(selectedFile, format as "mp3" | "aac" | "wav" | "flac");
          break;
        case "video":
          outputPath = await convertVideo(selectedFile, format as "mp4" | "avi" | "mkv" | "mov" | "mpg" | "webm");
          break;
        default:
          throw new Error("Unsupported file type");
      }

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Conversion Successful",
        message: `File converted to ${format.toUpperCase()}`,
        primaryAction: {
          title: "Open File",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => execPromise(`open "${outputPath}"`),
        },
      });
    } catch (error) {
      await toast.hide();
      console.error("Conversion error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Render error state if there's an error
  if (error) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Error occurred">
        <List.Item title={error} icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
      </List>
    );
  }

  // Render conversion options based on file type
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
