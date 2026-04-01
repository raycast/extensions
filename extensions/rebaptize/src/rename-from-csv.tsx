import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Color,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, rename as fsRename } from "fs/promises";
import { join, basename } from "path";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

interface RenameMapping {
  original: string;
  renamed: string;
}

function parseCsv(content: string, separator: string): RenameMapping[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const mappings: RenameMapping[] = [];

  for (const line of lines) {
    const parts = line.split(separator);
    if (parts.length >= 2) {
      const original = parts[0].trim();
      const renamed = parts[1].trim();
      if (original && renamed) {
        mappings.push({ original, renamed });
      }
    }
  }

  return mappings;
}

function PreviewList({ folderPath, previews }: { folderPath: string; previews: RenameMapping[] }) {
  const { pop } = useNavigation();

  async function executeRename() {
    const confirmed = await confirmAlert({
      title: `Rename ${previews.length} files?`,
      message: "This will rename the files as shown in the preview.",
      primaryAction: { title: "Rename" },
    });
    if (!confirmed) return;

    try {
      for (const p of previews) {
        await fsRename(join(folderPath, p.original), join(folderPath, p.renamed));
      }
      await saveUndoState({ folderPath, changes: previews, actionName: "Rename from CSV", timestamp: Date.now() });
      await showToast({ style: Toast.Style.Success, title: `Renamed ${previews.length} files` });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }

  return (
    <List navigationTitle="CSV Rename Preview">
      {previews.map((p) => (
        <List.Item
          key={p.original}
          title={p.renamed}
          subtitle={`← ${p.original}`}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Rename All" icon={Icon.Check} onAction={executeRename} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function RenameFromCsv() {
  const { push } = useNavigation();
  const [folder, setFolder] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [separator, setSeparator] = useState(",");

  useEffect(() => {
    (async () => {
      const f = await getFinderFolder();
      if (f) setFolder(f);
    })();
  }, []);

  async function onSubmit() {
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "Open a Finder window first" });
      return;
    }
    if (!csvContent.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Paste your rename mappings" });
      return;
    }

    const mappings = parseCsv(csvContent, separator);
    if (mappings.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No valid mappings found" });
      return;
    }

    // Verify that original files exist
    const entries = await readdir(folder);
    const existingFiles = new Set(entries);

    const validMappings = mappings.filter((m) => existingFiles.has(m.original));
    const missing = mappings.filter((m) => !existingFiles.has(m.original));

    if (validMappings.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No matching files found",
        message: `None of the ${mappings.length} original filenames exist in the folder`,
      });
      return;
    }

    if (missing.length > 0) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${missing.length} files not found, skipping`,
      });
    }

    push(<PreviewList folderPath={folder} previews={validMappings} />);
  }

  return (
    <Form
      navigationTitle="Rename from CSV"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview" icon={Icon.Eye} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Folder" text={folder ? basename(folder) : "Detecting..."} />
      <Form.TextArea
        id="csvContent"
        title="Rename Mappings"
        placeholder={"old-name.txt,new-name.txt\nphoto.jpg,vacation-001.jpg"}
        value={csvContent}
        onChange={setCsvContent}
        info="One mapping per line: old-filename, new-filename. The separator can be changed below."
      />
      <Form.Dropdown id="separator" title="Separator" value={separator} onChange={setSeparator}>
        <Form.Dropdown.Item value="," title="Comma (,)" />
        <Form.Dropdown.Item value="\t" title="Tab" />
        <Form.Dropdown.Item value=";" title="Semicolon (;)" />
        <Form.Dropdown.Item value="|" title="Pipe (|)" />
        <Form.Dropdown.Item value=" -> " title="Arrow (->)" />
      </Form.Dropdown>
      <Form.Description
        title="Tip"
        text="You can also paste content directly from a spreadsheet. Use Tab as the separator."
      />
    </Form>
  );
}
