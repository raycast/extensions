import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";

import { parseScanRootInput, saveScanRoots } from "../storage";
import { ScanRoot, StorageState } from "../types";

interface ManageScanRootsFormProps {
  scanRoots: ScanRoot[];
  onSaved: (state: StorageState) => Promise<void> | void;
  mode?: "add" | "manage";
}

interface ScanRootFormValues {
  roots?: string[];
  manualPaths?: string;
}

export function ManageScanRootsForm({ scanRoots, onSaved, mode = "manage" }: ManageScanRootsFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ScanRootFormValues) {
    const manualPaths = parseScanRootInput(values.manualPaths ?? "");
    const selectedPaths = values.roots ?? [];
    const basePaths = mode === "add" ? scanRoots.map((root) => root.path) : [];
    const state = await saveScanRoots([...basePaths, ...selectedPaths, ...manualPaths]);

    await showToast({
      style: Toast.Style.Success,
      title: mode === "add" ? "Scan directory added" : "Scan roots updated",
      message: `${state.scanRoots.length} root${state.scanRoots.length === 1 ? "" : "s"} configured`,
    });
    await onSaved(state);
    pop();
  }

  return (
    <Form
      navigationTitle={mode === "add" ? "Add Scan Directory" : "Manage Scan Roots"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "add" ? "Add Scan Directory" : "Save Scan Roots"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="roots"
        title="Directories"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={mode === "manage" ? scanRoots.map((root) => root.path) : []}
        info={
          mode === "add"
            ? "Choose one or more additional directories to scan."
            : "Choose one or more directories to scan recursively."
        }
      />
      <Form.TextArea
        id="manualPaths"
        title="Manual Paths"
        placeholder="~/Documents/Projects&#10;/Users/you/Work"
        info="Optional. Paste paths separated by new lines or commas."
      />
    </Form>
  );
}
