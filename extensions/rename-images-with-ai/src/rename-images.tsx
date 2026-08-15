import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  List,
  Icon,
  open,
  showInFinder,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { renameScreenshots } from "./utils/screenshot-renamer";
import path from "path";

interface ScreenshotItem {
  id: string;
  path: string;
  name: string;
  newName?: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export default function RenameScreenshotsCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(true);

  const selectFiles = async () => {
    try {
      const items = await getSelectedFinderItems();
      // Filter for image files
      const imageFiles = items.filter((item) => {
        const ext = path.extname(item.path).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
      });

      if (imageFiles.length > 0) {
        setSelectedFiles(imageFiles.map((item) => item.path));
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No images selected",
          message: "Please select image files in Finder",
        });
      }
    } catch (error) {
      console.error("Error selecting files:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error selecting files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    // When selected files change, update the screenshots array
    const newScreenshots = selectedFiles.map((filePath) => ({
      id: filePath,
      path: filePath,
      name: path.basename(filePath),
      status: "pending" as const,
    }));

    setScreenshots(newScreenshots);
  }, [selectedFiles]);

  const handleRename = async () => {
    if (screenshots.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select screenshots to rename",
      });
      return;
    }

    setIsLoading(true);
    setIsSelectionMode(false);

    try {
      // Update UI to show processing
      setScreenshots((current) =>
        current.map((item) => ({
          ...item,
          status: "processing",
        }))
      );

      // Call the rename function
      const results = await renameScreenshots(screenshots.map((item) => item.path));

      // Update UI with results
      setScreenshots((current) => {
        return current.map((item) => {
          const result = results.find((r) => r.originalPath === item.path);
          if (!result) {
            return item;
          }

          return {
            ...item,
            newName: result.success ? path.basename(result.newPath) : undefined,
            status: result.success ? "success" : "error",
            error: result.error,
          };
        });
      });

      const successCount = results.filter((r) => r.success).length;

      await showToast({
        style: Toast.Style.Success,
        title: "Screenshots Renamed",
        message: `Successfully renamed ${successCount} of ${results.length} screenshots`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Renaming Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      // Update UI to show error
      setScreenshots((current) =>
        current.map((item) => ({
          ...item,
          status: "error",
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render selection mode or results mode
  if (isSelectionMode) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Select Images" onAction={selectFiles} icon={Icon.Image} />
            {selectedFiles.length > 0 && <Action title="Rename Images" onAction={handleRename} icon={Icon.Text} />}
          </ActionPanel>
        }
      >
        <Form.Description
          title="Selected Files"
          text={
            selectedFiles.length > 0
              ? `${selectedFiles.length} file(s) selected: ${selectedFiles
                  .map((file) => path.basename(file))
                  .join(", ")}`
              : "No images selected - click 'Select Images' to choose images"
          }
        />
        <Form.Description
          title="Instructions"
          text="Select one or more screenshots to rename them using AI. The extension will analyze the content of each image and generate a descriptive filename."
        />
        {selectedFiles.length > 0 && <Form.Separator />}
      </Form>
    );
  } else {
    // Results view
    return (
      <List isLoading={isLoading}>
        {screenshots.length === 0 ? (
          <List.EmptyView title="No Screenshots" description="No screenshots have been processed yet" />
        ) : (
          screenshots.map((item) => (
            <List.Item
              key={item.id}
              title={item.newName || item.name}
              subtitle={item.status === "success" ? "Renamed successfully" : item.status}
              icon={getStatusIcon(item.status)}
              accessories={[{ text: item.status === "success" ? "✓" : item.status === "error" ? "✗" : "⋯" }]}
              actions={
                <ActionPanel>
                  {item.status === "success" && (
                    <>
                      <Action
                        title="Open File"
                        icon={Icon.Eye}
                        onAction={() =>
                          open(item.newName ? path.join(path.dirname(item.path), item.newName) : item.path)
                        }
                      />
                      <Action
                        title="Show in Finder"
                        icon={Icon.Finder}
                        onAction={() =>
                          showInFinder(item.newName ? path.join(path.dirname(item.path), item.newName) : item.path)
                        }
                      />
                    </>
                  )}
                  {item.status === "error" && (
                    <Action
                      title="Show Original in Finder"
                      icon={Icon.Finder}
                      onAction={() => showInFinder(item.path)}
                    />
                  )}
                  <Action title="Return to Selection" icon={Icon.ArrowLeft} onAction={() => setIsSelectionMode(true)} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }
}

function getStatusIcon(status: ScreenshotItem["status"]): Icon {
  switch (status) {
    case "pending":
      return Icon.Clock;
    case "processing":
      return Icon.CircleProgress;
    case "success":
      return Icon.Checkmark;
    case "error":
      return Icon.ExclamationMark;
    default:
      return Icon.QuestionMark;
  }
}
