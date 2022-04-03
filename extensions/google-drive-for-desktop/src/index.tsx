import { getPreferenceValues, List } from "@raycast/api";
import fs from "fs";
import path from "path";

interface Preferences {
  rootPath: string;
  excludePaths?: string;
}

export default function SearchGoogleDriveForDesktopFile() {
  const preferences = getPreferenceValues<Preferences>();

  const rootPath = path.resolve(preferences.rootPath);
  const exludePaths = preferences.excludePaths?.split(",").map((p) => path.resolve(p)) ?? [];

  const files = fs.readdirSync(preferences.rootPath, { withFileTypes: true });
  return (
    <List>
      {files.map((file) => (
        <List.Item key={file.name} title={file.name} />
      ))}
    </List>
  );
}
