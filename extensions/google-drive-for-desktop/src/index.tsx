import { List } from "@raycast/api";
import fs from "fs";

export default function SearchGoogleDriveForDesktopFile() {
  const files = fs.readdirSync("/Volumes/GoogleDrive/", { withFileTypes: true });
  return (
    <List>
      {files.map((file) => (
        <List.Item key={file.name} title={file.name} />
      ))}
    </List>
  );
}
