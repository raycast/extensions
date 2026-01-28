import { GcodeFilesResponse } from "../types/files";
import { timeCalculator } from "../utils/timeCalculator";
import { List, Color, Icon } from "@raycast/api";

export function FileEntry({ file }: { file: GcodeFilesResponse["files"] }) {
  if (file.type == "folder") {
    return <FolderEntry folder={file} />;
  }
  const estimatedPrintTime = timeCalculator(file?.gcodeAnalysis?.estimatedPrintTime);
  const fileSize = (file?.size / 1000000).toFixed(1) + " mb";
  const uploadDateTime = new Date(file?.date * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return (
    <List.Item
      key={file.name}
      icon="octoprint-logo.png"
      title={file.name}
      accessories={[
        {
          tag: { value: estimatedPrintTime, color: Color.Blue },
          icon: Icon.Clock,
          tooltip: "Estimated Print Time",
        },
        {
          tag: { value: fileSize, color: Color.Green },
          icon: Icon.HardDrive,
          tooltip: "File size",
        },
        {
          tag: { value: uploadDateTime, color: Color.SecondaryText },
          icon: Icon.Calendar,
          tooltip: "Date and time of upload",
        },
      ]}
    />
  );
}

function FolderEntry({ folder }: { folder: GcodeFilesResponse["files"] }) {
  return (
    <>
      {folder.children.map((file) => (
        <FileEntry file={file} key={file.path} />
      ))}
    </>
  );
}
