import { Alert, confirmAlert, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import fs from "fs-extra";
import path, { ParsedPath } from "path";
import { preferences } from "./utils";

export enum ActionType {
  MOVE = "move",
  COPY = "copy",
}

export const getItemAndSend = async (destPath: string, action: ActionType): Promise<boolean> => {
  const { selectedFile, selectedFolder } = await getSelectedItemPath();
  if (selectedFile.length === 0 && selectedFolder.length === 0) {
    await showToast(Toast.Style.Failure, "Nothing is selected.");
    return false;
  }
  const parentFolderPath = selectedFile.length === 0 ? selectedFolder[0].dir : selectedFile[0].dir;

  if (preferences().disableWarning) {
    const moveResult = sendFileTo(selectedFile, selectedFolder, parentFolderPath, destPath, true, action);
    if (await showParentSameFolderTips(moveResult, parentFolderPath, selectedFile, selectedFolder, action)) {
      return moveResult.isMoved;
    }
    await followUpWork(moveResult, parentFolderPath, destPath, action);
    return moveResult.isMoved;
  } else {
    const moveResult = await sendFileShowAlert(selectedFile, selectedFolder, parentFolderPath, destPath, action);
    if (await showParentSameFolderTips(moveResult, parentFolderPath, selectedFile, selectedFolder, action)) {
      return moveResult.isMoved;
    }
    if (moveResult.isMoved) {
      await followUpWork(moveResult, parentFolderPath, destPath, action);
    } else {
      await showToast(Toast.Style.Failure, "Operation is canceled.");
    }
    return moveResult.isMoved;
  }
};

const showParentSameFolderTips = async (
  moveResult: { isMoved: boolean; isParentSameFolder: boolean },
  parentFolderPath: string,
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  action: ActionType
) => {
  if (moveResult.isParentSameFolder && selectedFile.length + selectedFolder.length == 1) {
    await showToast(
      Toast.Style.Failure,
      `Nothing is ${action == ActionType.MOVE ? "moved" : "copied"}.`,
      `${path.parse(parentFolderPath).base} is ignored.`
    );
    return true;
  }
  return false;
};

//end work
const followUpWork = async (
  moveResult: { isMoved: boolean; isParentSameFolder: boolean },
  parentFolderPath: string,
  destPath: string,
  action: ActionType
) => {
  try {
    if (moveResult.isParentSameFolder) {
      await showToast(
        Toast.Style.Success,
        `Files are ${action == ActionType.MOVE ? "moved" : "copied"} to ${path.parse(destPath).base}`,
        `${path.parse(parentFolderPath).base} is ignored`
      );
    } else {
      await showToast(
        Toast.Style.Success,
        `Files are ${action == ActionType.MOVE ? "moved" : "copied"} to ${path.parse(destPath).base}`
      );
    }
    if (preferences().openDestDirectory) {
      await open(destPath);
    }
  } catch (e) {
    console.error(String(e));
  }
};

//start work
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

export async function sendFileShowAlert(
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
          moveResult = sendFileTo(selectedFile, selectedFolder, parentFolderPath, destPath, true, action);
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
    moveResult = sendFileTo(selectedFile, selectedFolder, parentFolderPath, destPath, true, action);
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

export function sendFileTo(
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  parentFolderPath: string,
  destPath: string,
  overwrite: boolean,
  action: ActionType
) {
  const isParentSameFolder: boolean[] = [];
  switch (action) {
    case ActionType.COPY: {
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
    case ActionType.MOVE: {
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
