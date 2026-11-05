import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, getSelectedFinderItems, Icon, useNavigation } from "@raycast/api";
import { importWithToast } from "./helpers/import-export";

function isYamlPath(path: string): boolean {
  return /\.ya?ml$/i.test(path);
}

interface ImportAppsFormProps {
  /** Go back to the previous view after a clean import (when pushed from Manage Apps) */
  popOnSuccess?: boolean;
}

export function ImportAppsForm({ popOnSuccess = false }: ImportAppsFormProps) {
  const { pop } = useNavigation();
  const [files, setFiles] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | undefined>();
  const [isImporting, setIsImporting] = useState(false);
  const importInFlight = useRef(false);
  const pickerTouched = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    // Set here, not only in useRef: Raycast's development mode runs this cleanup once right after mounting, and a
    // ref left false would skip the setIsImporting(false) below, leaving the spinner running after the import
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Pre-fill from Finder only while the user hasn't touched the picker
  useEffect(() => {
    let mounted = true;
    getSelectedFinderItems()
      .then((items) => {
        const selected = items.map((item) => item.path).find(isYamlPath);
        if (mounted && selected && !pickerTouched.current) setFiles([selected]);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    const [filePath] = files;
    if (!filePath) {
      setFileError("Choose a file to import");
      return;
    }
    if (!isYamlPath(filePath)) {
      setFileError("Choose a .yaml or .yml file exported from @ Profile");
      return;
    }

    // A second submit while the first runs would merge twice and pop twice
    if (importInFlight.current) return;
    importInFlight.current = true;
    setIsImporting(true);
    try {
      const imported = await importWithToast(filePath);
      // Escaping the form mid-import already left it; popping then would also close the view below
      if (imported && popOnSuccess && mounted.current) pop();
    } finally {
      importInFlight.current = false;
      if (mounted.current) setIsImporting(false);
    }
  };

  return (
    <Form
      isLoading={isImporting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Export File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        error={fileError}
        onChange={(value) => {
          pickerTouched.current = true;
          setFiles(value);
          setFileError(undefined);
        }}
      />
      <Form.Description text="Merges the file's custom apps, show/hide settings and History into what you already have." />
    </Form>
  );
}

export default function ImportAppsCommand() {
  return <ImportAppsForm />;
}
