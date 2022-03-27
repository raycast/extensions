import { getPreferenceValues, List } from "@raycast/api";
import fs from "fs";

interface Preferences {
  rootPath: string;
  excludePaths?: string;
}

export default function SearchGoogleDriveForDesktopFile() {
  const preferences = getPreferenceValues<Preferences>();
  const files = fs.readdirSync(preferences.rootPath, { withFileTypes: true });
  return (
    <List>
      {files.map((file) => (
        <List.Item key={file.name} title={file.name} />
      ))}
    </List>
  );
}
