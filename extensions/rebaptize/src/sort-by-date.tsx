import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, stat, mkdir, copyFile, rename as fsRename } from "fs/promises";
import { join } from "path";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

type DateGranularity = "day" | "month" | "year";
type FileAction = "move" | "copy";

interface DateGroup {
  label: string;
  files: string[];
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function formatDateLabel(date: Date, granularity: DateGranularity): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  switch (granularity) {
    case "day":
      return `${y}-${m}-${d}`;
    case "month":
      return `${y}-${m} ${monthNames[date.getMonth()]}`;
    case "year":
      return `${y}`;
  }
}

async function scanAndGroup(folderPath: string, granularity: DateGranularity): Promise<DateGroup[]> {
  const entries = await readdir(folderPath);
  const groups = new Map<string, string[]>();

  for (const entry of entries) {
    if (isHidden(entry)) continue;
    const fullPath = join(folderPath, entry);
    const s = await stat(fullPath);
    if (!s.isFile()) continue;

    const date = s.birthtime.getTime() > 0 ? s.birthtime : s.mtime;
    const label = formatDateLabel(date, granularity);
    const existing = groups.get(label) || [];
    existing.push(entry);
    groups.set(label, existing);
  }

  return Array.from(groups.entries())
    .map(([label, files]) => ({ label, files: files.sort() }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function organizeByDate(
  folderPath: string,
  groups: DateGroup[],
  granularity: DateGranularity,
  action: FileAction,
): Promise<{ count: number; changes: { original: string; renamed: string }[] }> {
  let count = 0;
  const changes: { original: string; renamed: string }[] = [];

  for (const group of groups) {
    const safeName = group.label.replace(/[/\\:*?"<>|]/g, "_").trim();
    const targetDir = join(folderPath, safeName);
    await mkdir(targetDir, { recursive: true });

    for (const fileName of group.files) {
      const src = join(folderPath, fileName);
      const dest = join(targetDir, fileName);
      if (action === "copy") {
        await copyFile(src, dest);
      } else {
        await fsRename(src, dest);
        changes.push({ original: fileName, renamed: join(safeName, fileName) });
      }
      count++;
    }
  }
  return { count, changes };
}

function PreviewGroups({
  folderPath,
  groups,
  granularity,
  action,
}: {
  folderPath: string;
  groups: DateGroup[];
  granularity: DateGranularity;
  action: FileAction;
}) {
  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
  const actionVerb = action === "move" ? "Move" : "Copy";

  async function doOrganize() {
    const confirmed = await confirmAlert({
      title: `${actionVerb} ${totalFiles} files into ${groups.length} folders?`,
      message:
        action === "move"
          ? "You can undo this with the 'Undo Last Rename' command."
          : "Files will be copied into subfolders.",
      primaryAction: { title: actionVerb },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: `${actionVerb.replace(/e$/, "")}ing files...` });
      const { count, changes } = await organizeByDate(folderPath, groups, granularity, action);
      if (changes.length > 0) {
        await saveUndoState({ folderPath, changes, actionName: "Sort Files by Date", timestamp: Date.now() });
      }
      await showToast({ style: Toast.Style.Success, title: "Done!", message: `${count} files organized` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${actionVerb} failed`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List navigationTitle="Date Groups">
      <List.Section title={`${totalFiles} files → ${groups.length} date folders`}>
        {groups.map((g) => (
          <List.Item
            key={g.label}
            icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            title={g.label}
            subtitle={`${g.files.length} file${g.files.length === 1 ? "" : "s"}`}
            accessories={[{ text: `→ ${g.label}/` }]}
            actions={
              <ActionPanel>
                <Action title={`${actionVerb} All to Folders`} icon={Icon.Checkmark} onAction={doOrganize} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function SortByDate() {
  const { push } = useNavigation();
  const [detectedFolder, setDetectedFolder] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<DateGranularity>("month");
  const [action, setAction] = useState<FileAction>("move");

  useEffect(() => {
    (async () => {
      const folder = await getFinderFolder();
      if (folder) setDetectedFolder(folder);
    })();
  }, []);

  async function handleSubmit(values: { folder: string[] }) {
    const folderPath = values.folder?.[0] || detectedFolder;
    if (!folderPath) {
      await showToast({ style: Toast.Style.Failure, title: "No folder selected" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Scanning files..." });
      const groups = await scanAndGroup(folderPath, granularity);

      if (groups.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No files found" });
        return;
      }

      push(<PreviewGroups folderPath={folderPath} groups={groups} granularity={granularity} action={action} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scan Files" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={detectedFolder ? [detectedFolder] : undefined}
        info={
          detectedFolder
            ? `Auto-detected from Finder: ${detectedFolder}`
            : "Open a Finder window or select a folder manually"
        }
      />

      <Form.Dropdown
        id="granularity"
        title="Group By"
        value={granularity}
        onChange={(v) => setGranularity(v as DateGranularity)}
      >
        <Form.Dropdown.Item value="day" title="Day (2026-03-30)" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="month" title="Month (2026-03)" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="year" title="Year (2026)" icon={Icon.Calendar} />
      </Form.Dropdown>

      <Form.Dropdown id="action" title="File Action" value={action} onChange={(v) => setAction(v as FileAction)}>
        <Form.Dropdown.Item value="move" title="Move Files" icon={Icon.ArrowRight} />
        <Form.Dropdown.Item value="copy" title="Copy Files" icon={Icon.CopyClipboard} />
      </Form.Dropdown>

      <Form.Description
        title="How It Works"
        text="Groups all files in the folder by their creation date and organizes them into date-named subfolders."
      />
    </Form>
  );
}
