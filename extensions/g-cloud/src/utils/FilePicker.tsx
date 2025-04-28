import { Form, ActionPanel, Action, useNavigation, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { openFilePicker } from "./NativeFilePicker";
import { validateFile } from "./FileUtils";

export interface FilePickerProps {
  onFilePicked: (filePath: string) => void;
  title?: string;
  placeholder?: string;
  info?: string;
  submitTitle?: string;
  cancelTitle?: string;
  allowedFileTypes?: string[];
  children?: ReactNode;
}

export function FilePicker({
  onFilePicked,
  title = "Select File",
  placeholder = "/path/to/your/file",
  info = "Enter the full path to the file",
  submitTitle = "Select",
  cancelTitle = "Cancel",
  allowedFileTypes = [],
  children,
}: FilePickerProps) {
  const { pop } = useNavigation();
  const [filePath, setFilePath] = useState<string>("");
  const [error, setError] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);

  const handleBrowse = async () => {
    if (isValidating) return;

    try {
      setError(undefined);
      const selectedPath = await openFilePicker({
        prompt: "Select a file",
        allowedFileTypes: allowedFileTypes,
      });

      if (selectedPath && typeof selectedPath === "string") {
        setFilePath(selectedPath);
      } else if (selectedPath !== undefined) {
        setError("Please select a valid file");
        await showFailureToast({
          title: "Invalid Selection",
          message: "Please select a valid file",
        });
      }
    } catch (error) {
      console.error("Error opening file picker:", error);
      setError("Failed to open file picker");
      await showFailureToast({
        title: "File Picker Error",
        message: error instanceof Error ? error.message : "Failed to open file picker",
      });
    }
  };

  const handleSubmit = async (values: { filePath: string }) => {
    if (isValidating) return;

    if (!values.filePath) {
      setError("Please select a file or enter a valid file path");
      await showFailureToast({
        title: "No File Selected",
        message: "Please select a file or enter a valid file path",
      });
      return;
    }

    try {
      setError(undefined);
      setIsValidating(true);

      const validatingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Validating file...",
        message: values.filePath,
      });

      const isValid = await validateFile(values.filePath);

      validatingToast.hide();
      setIsValidating(false);

      if (isValid) {
        onFilePicked(values.filePath);
        pop();
      } else {
        setError("Invalid file path or file type");
      }
    } catch (error) {
      setIsValidating(false);
      console.error("Error validating file:", error);
      setError(error instanceof Error ? error.message : "Failed to validate file");
      await showFailureToast({
        title: "Validation Error",
        message: error instanceof Error ? error.message : "Failed to validate file",
      });
    }
  };

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isValidating ? "Validating…" : submitTitle}
            icon={submitTitle.toLowerCase().includes("upload") ? Icon.Upload : Icon.Check}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleSubmit}
          />
          <Action
            title="Browse…"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={handleBrowse}
          />
          <Action title={cancelTitle} icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="filePath"
        title="File Path"
        placeholder={placeholder}
        info={info}
        error={error}
        value={filePath}
        onChange={(newValue) => {
          setFilePath(newValue);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description
        title="Options"
        text="You can either paste a file path or click 'Browse…' to select a file using the native file picker."
      />
      {children}
    </Form>
  );
}

export function CloudStorageUploader({
  onFilePicked,
  destinationInfo,
  title = "Upload File",
  allowedFileTypes = [],
}: {
  onFilePicked: (filePath: string) => void;
  destinationInfo: string;
  title?: string;
  allowedFileTypes?: string[];
}) {
  return (
    <FilePicker
      onFilePicked={onFilePicked}
      title={title}
      placeholder="/path/to/your/file.txt"
      info="Enter the full path to the file you want to upload or click 'Browse…'"
      submitTitle="Upload"
      cancelTitle="Cancel"
      allowedFileTypes={allowedFileTypes}
    >
      <Form.Description title="Destination" text={destinationInfo} />
    </FilePicker>
  );
}
