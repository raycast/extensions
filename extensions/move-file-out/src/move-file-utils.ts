import { Alert, confirmAlert, getSelectedFinderItems } from "@raycast/api";
import fs from "fs-extra";
import path, { ParsedPath } from "path";

export enum ActionType {
  move = "move",
  copy = "copy",
}

export const getSelectedItemPath = async () => {
  const selectedFile: ParsedPath[] = [];
  const selectedFolder: ParsedPath[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fs.lstatSync(value.path);
      if (stat.isDirectory()) {
        selectedFolder.push(path.parse(value.path));
      }
      if (stat.isFile()) {
        selectedFile.push(path.parse(value.path));
      }
    });
    return { selectedFile: selectedFile, selectedFolder: selectedFolder };
  } catch (e) {
    console.error(String(e));
    return { selectedFile: selectedFile, selectedFolder: selectedFolder };
  }
};

export async function moveFileShowAlert(
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  parentFolderPath: string,
  destPath: string,
  action: ActionType
) {
  let isMoved = true;

  //check if parent folder with same name exists
  let moveResult = { isMoved: true, isParentSameFolder: false };

  //check if file and folder exists
  if (
    checkExistsSameNameFile(parentFolderPath, destPath, selectedFile) ||
    checkExistsSameNameFile(parentFolderPath, destPath, selectedFolder)
  ) {
    const options: Alert.Options = {
      title: "⚠️ Overwrite",
      message: "Files or folders already exist in the destination path. Do you want to overwrite?",
      primaryAction: {
        title: "Overwrite All",
        onAction: () => {
          moveResult = moveOrCopyFileAndFolder(selectedFile, selectedFolder, parentFolderPath, destPath, true, action);
        },
      },
      dismissAction: {
        title: "Cancel",
        onAction: () => {
          isMoved = false;
        },
      },
    };
    await confirmAlert(options);
  } else {
    // move file
    moveResult = moveOrCopyFileAndFolder(selectedFile, selectedFolder, parentFolderPath, destPath, true, action);
  }

  return { isMoved: isMoved, isParentSameFolder: moveResult.isParentSameFolder };
}

export function checkExistsSameNameFile(parentFolderPath: string, destPath: string, parsedPaths: ParsedPath[]) {
  for (const parsedPath of parsedPaths) {
    if (fs.pathExistsSync(destPath + "/" + parsedPath.base)) {
      if (parentFolderPath != destPath + "/" + parsedPath.base) return true;
    }
  }
  return false;
}

export function moveOrCopyFileAndFolder(
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  parentFolderPath: string,
  destPath: string,
  overwrite: boolean,
  action: ActionType
) {
  const isParentSameFolder: boolean[] = [];
  switch (action) {
    case ActionType.copy: {
      // copy file
      selectedFile.forEach((value) => {
        fsCopyFile(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite);
      });
      selectedFolder.forEach((value) => {
        isParentSameFolder.push(
          fsCopyFolder(parentFolderPath, value.dir + "/" + value.base, destPath + "/" + value.base, overwrite)
        );
      });
      return { isMoved: true, isParentSameFolder: isParentSameFolder.includes(true) };
    }
    case ActionType.move: {
      // move file
      selectedFile.forEach((value) => {
        fsMoveFile(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite);
      });
      for (const value of selectedFolder) {
        isParentSameFolder.push(
          fsMoveFolder(parentFolderPath, value.dir + "/" + value.base, destPath + "/" + value.base, overwrite)
        );
      }
      return { isMoved: true, isParentSameFolder: isParentSameFolder.includes(true) };
    }
  }
}

export function fsCopyFile(src: string, dest: string, overwrite: boolean) {
  try {
    fs.copySync(src, dest, { overwrite: overwrite });
  } catch (e) {
    console.error(String(e));
  }
}
export function fsCopyFolder(parentFolderPath: string, src: string, dest: string, overwrite: boolean) {
  let isParentSameFolder = false;
  try {
    if (parentFolderPath == dest) {
      isParentSameFolder = true;
    } else {
      fs.copySync(src, dest, { overwrite: overwrite });
    }
    return isParentSameFolder;
  } catch (e) {
    console.error(String(e));
    return isParentSameFolder;
  }
}

export function fsMoveFile(src: string, dest: string, overwrite: boolean) {
  try {
    fs.moveSync(src, dest, { overwrite: overwrite });
  } catch (e) {
    console.error(String(e));
  }
}
export function fsMoveFolder(parentFolderPath: string, src: string, dest: string, overwrite: boolean) {
  let isParentSameFolder = false;
  try {
    if (parentFolderPath == dest) {
      isParentSameFolder = true;
    } else {
      fs.moveSync(src, dest, { overwrite: overwrite });
    }
    return isParentSameFolder;
  } catch (e) {
    console.error(String(e));
    return isParentSameFolder;
  }
}
