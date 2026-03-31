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
import {
  type LocationGranularity,
  type FileAction,
  type LocationGroup,
  scanFolder,
  groupByLocation,
  organizeByLocation,
} from "./location";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

function PreviewGroups({
  folderPath,
  groups,
  action,
  noLocationCount,
}: {
  folderPath: string;
  groups: LocationGroup[];
  action: FileAction;
  noLocationCount: number;
}) {
  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
  const actionVerb = action === "move" ? "Move" : "Copy";

  async function doOrganize() {
    // Filter out "No Location Data" group — those stay in place
    const groupsToOrganize = groups.filter((g) => g.location !== "No Location Data");
    const fileCount = groupsToOrganize.reduce((sum, g) => sum + g.files.length, 0);

    const confirmed = await confirmAlert({
      title: `${actionVerb} ${fileCount} files into ${groupsToOrganize.length} folders?`,
      message:
        action === "move"
          ? "You can undo this with the 'Undo Last Rename' command."
          : "Files will be copied into subfolders.",
      primaryAction: { title: actionVerb },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: `${actionVerb.replace(/e$/, "")}ing files...` });
      const { count, changes } = await organizeByLocation(folderPath, groupsToOrganize, action);
      if (changes.length > 0) {
        await saveUndoState({ folderPath, changes, actionName: "Sort Photos by Location", timestamp: Date.now() });
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
    <List navigationTitle="Location Groups">
      <List.Section title={`${totalFiles} files → ${groups.length} locations`}>
        {groups.map((g) => {
          const isNoLocation = g.location === "No Location Data";
          return (
            <List.Item
              key={g.location}
              icon={{
                source: isNoLocation ? Icon.QuestionMarkCircle : Icon.Pin,
                tintColor: isNoLocation ? Color.SecondaryText : Color.Blue,
              }}
              title={g.location}
              subtitle={`${g.files.length} file${g.files.length === 1 ? "" : "s"}`}
              accessories={isNoLocation ? [{ text: "Will stay in place" }] : [{ text: `→ ${g.location}/` }]}
              actions={
                <ActionPanel>
                  {!isNoLocation && (
                    <Action title={`${actionVerb} All to Folders`} icon={Icon.Checkmark} onAction={doOrganize} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {noLocationCount > 0 && (
        <List.Section title="Info">
          <List.Item
            icon={{ source: Icon.Info, tintColor: Color.Orange }}
            title={`${noLocationCount} file${noLocationCount === 1 ? "" : "s"} have no GPS data and will be skipped`}
          />
        </List.Section>
      )}
    </List>
  );
}

export default function SortByLocation() {
  const { push } = useNavigation();
  const [detectedFolder, setDetectedFolder] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<LocationGranularity>("city");
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

    const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning photos for GPS data..." });

    try {
      const results = await scanFolder(folderPath, granularity, (current, total, fileName) => {
        toast.message = `${current}/${total} — ${fileName}`;
      });

      if (results.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No image files found",
          message: "The folder has no JPEG, TIFF, or HEIC files.",
        });
        return;
      }

      const withLocation = results.filter((r) => r.location !== null).length;
      if (withLocation === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No GPS data found",
          message: "None of the photos contain location metadata.",
        });
        return;
      }

      const groups = groupByLocation(results);
      const noLocationCount = results.filter((r) => r.location === null).length;

      toast.hide();

      push(<PreviewGroups folderPath={folderPath} groups={groups} action={action} noLocationCount={noLocationCount} />);
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
          <Action.SubmitForm title="Scan Photos" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
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
        onChange={(v) => setGranularity(v as LocationGranularity)}
      >
        <Form.Dropdown.Item value="city" title="City" icon={Icon.Building} />
        <Form.Dropdown.Item value="state" title="State / Region" icon={Icon.Map} />
        <Form.Dropdown.Item value="country" title="Country" icon={Icon.Globe} />
      </Form.Dropdown>

      <Form.Dropdown id="action" title="File Action" value={action} onChange={(v) => setAction(v as FileAction)}>
        <Form.Dropdown.Item value="move" title="Move Files" icon={Icon.ArrowRight} />
        <Form.Dropdown.Item value="copy" title="Copy Files" icon={Icon.CopyClipboard} />
      </Form.Dropdown>

      <Form.Description
        title="How It Works"
        text="Scans photos for GPS data in EXIF metadata, resolves locations via OpenStreetMap, and organizes files into subfolders named after the location. Photos without GPS data are left untouched."
      />
    </Form>
  );
}
