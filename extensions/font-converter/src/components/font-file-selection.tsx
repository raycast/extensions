import { Action, ActionPanel, Form, getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState, type ReactNode } from "react";
import { getFontFormat } from "../lib/fonts";

type Selection = { kind: "loading" } | { kind: "choose" } | { kind: "selected"; filePath: string };

export function FontFileSelection(props: { children: (filePath: string, chooseAnotherFile: () => void) => ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ kind: process.platform === "darwin" ? "loading" : "choose" });
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (process.platform !== "darwin") return;
    let active = true;
    async function selectFinderFile() {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 0) {
          if (active) setSelection({ kind: "choose" });
          return;
        }
        getFontFormat(items[0].path);
        if (active) setSelection({ kind: "selected", filePath: items[0].path });
      } catch {
        if (active) setSelection({ kind: "choose" });
      }
    }
    void selectFinderFile();
    return () => {
      active = false;
    };
  }, []);

  if (selection.kind === "selected") {
    return props.children(selection.filePath, () => setSelection({ kind: "choose" }));
  }

  function submit(values: { fontFile: string[] }) {
    const filePath = values.fontFile[0];
    if (!filePath) {
      setError("Choose a font file.");
      return;
    }
    try {
      getFontFormat(filePath);
      setSelection({ kind: "selected", filePath });
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Form
      isLoading={selection.kind === "loading"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Use Font File" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a TTF, OTF, WOFF, WOFF2, or EOT font file." />
      <Form.FilePicker
        id="fontFile"
        title="Font File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={(files) => {
          setFiles(files);
          setError(undefined);
        }}
        error={error}
      />
    </Form>
  );
}
