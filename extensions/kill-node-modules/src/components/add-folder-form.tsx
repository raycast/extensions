import { Action, ActionPanel, Form, useNavigation, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState } from "react";
import path from "path";

export interface FolderConfig {
  id: string;
  path: string;
  useDeepScan: boolean;
  scanDepth: number;
}

const SCAN_DEPTH_OPTIONS = [
  { title: "Unlimited", value: "unlimited" },
  { title: "2", value: "2" },
  { title: "3", value: "3" },
  { title: "4", value: "4" },
  { title: "5", value: "5" },
  { title: "6", value: "6" },
  { title: "7", value: "7" },
  { title: "8", value: "8" },
];

interface AddFolderFormProps {
  onFolderAdded: (folder: FolderConfig) => void;
  existingFolder?: FolderConfig;
}

function getInitialScanDepthValue(existingFolder?: FolderConfig): string {
  if (!existingFolder) return "3";
  return existingFolder.useDeepScan ? "unlimited" : String(existingFolder.scanDepth);
}

export function AddFolderForm({ onFolderAdded, existingFolder }: AddFolderFormProps) {
  const { pop } = useNavigation();
  const [folderPath, setFolderPath] = useState<string[]>(existingFolder ? [existingFolder.path] : []);
  const [scanDepthValue, setScanDepthValue] = useState(getInitialScanDepthValue(existingFolder));

  async function handleSubmit() {
    if (folderPath.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a folder",
      });
      return;
    }

    const selectedPath = folderPath[0];
    const useDeepScan = scanDepthValue === "unlimited";
    const scanDepth = useDeepScan ? -1 : parseInt(scanDepthValue, 10);

    const folder: FolderConfig = {
      id: existingFolder?.id ?? Date.now().toString(),
      path: selectedPath,
      useDeepScan,
      scanDepth,
    };

    // Get existing folders from LocalStorage
    const existingFoldersJson = await LocalStorage.getItem<string>("folders");
    const existingFolders: FolderConfig[] = existingFoldersJson ? JSON.parse(existingFoldersJson) : [];

    // Check for duplicate path (only if not editing)
    if (!existingFolder && existingFolders.some((f) => f.path === selectedPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder already exists",
        message: path.basename(selectedPath),
      });
      return;
    }

    // Update or add folder
    let updatedFolders: FolderConfig[];
    if (existingFolder) {
      updatedFolders = existingFolders.map((f) => (f.id === existingFolder.id ? folder : f));
    } else {
      updatedFolders = [...existingFolders, folder];
    }

    await LocalStorage.setItem("folders", JSON.stringify(updatedFolders));

    await showToast({
      style: Toast.Style.Success,
      title: existingFolder ? "Folder updated" : "Folder added",
      message: path.basename(selectedPath),
    });

    onFolderAdded(folder);
    pop();
  }

  return (
    <Form
      navigationTitle={existingFolder ? "Edit Folder" : "Add Folder"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingFolder ? "Update Folder" : "Add Folder"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folderPath}
        onChange={setFolderPath}
      />
      <Form.Dropdown
        id="scanDepth"
        title="Scan Depth"
        info="Unlimited scans all subdirectories. Limited depth is faster for large folders."
        value={scanDepthValue}
        onChange={setScanDepthValue}
      >
        {SCAN_DEPTH_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
