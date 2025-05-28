import fs from "node:fs";
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
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const a = fs.readlinkSync(filePath);
  const originalPath = a.startsWith("/") ? a : `${props.fileData.path}/${a}`;
  const originalFileData = fs.lstatSync(originalPath, { throwIfNoEntry: false });
  if (originalFileData?.isDirectory() ?? false) {
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
