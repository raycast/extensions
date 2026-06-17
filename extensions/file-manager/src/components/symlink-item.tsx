import fs from "node:fs";
import { join, resolve } from "node:path";
import { Icon, List } from "@raycast/api";
import { DirectoryItem } from "./directory-item";
import { FileItem } from "./file-item";
import { FileDataType } from "../types";
import { GitIgnoreHelper } from "@gerhobbelt/gitignore-parser";

export function SymlinkItem(props: {
  fileData: FileDataType;
  refresh: () => void;
  preferences: Preferences;
  ignores: GitIgnoreHelper[];
}) {
  const filePath = join(props.fileData.path, props.fileData.name);
  const brokenSymlink = <List.Item title={props.fileData.name} subtitle="Broken symlink" icon={Icon.Warning} />;
  let originalPath: string;
  try {
    const a = fs.readlinkSync(filePath);
    originalPath = resolve(props.fileData.path, a);
  } catch {
    return brokenSymlink;
  }
  const originalFileData = fs.lstatSync(originalPath, { throwIfNoEntry: false });
  if (originalFileData === undefined) {
    return brokenSymlink;
  }
  if (originalFileData.isDirectory()) {
    return (
      <DirectoryItem
        fileData={props.fileData}
        refresh={props.refresh}
        isSymlink={true}
        originalPath={originalPath}
        preferences={props.preferences}
        ignores={props.ignores}
      />
    );
  } else {
    return (
      <FileItem
        fileData={props.fileData}
        refresh={props.refresh}
        isSymlink={true}
        originalPath={originalPath}
        preferences={props.preferences}
      />
    );
  }
}
