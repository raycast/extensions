import {
  Alert,
  confirmAlert,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import fse from "fs-extra";
import path, { ParsedPath } from "path";
import { checkDirectoryEmpty, isEmpty } from "./common-utils";
import { Preferences } from "../types/preferences";
import { getChooseFolder } from "./applescript-utils";

export enum ActionType {
  MOVE = "move",
  COPY = "copy",
}

//fetch selected item
export const getSelectedItemPath = async () => {
  const selectedFile: ParsedPath[] = [];
  const selectedFolder: ParsedPath[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fse.lstatSync(value.path);
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

//pre check
export function checkExistsSameFiles(toPath: string, parsedSrcPaths: ParsedPath[]) {
  for (const srcParsePath of parsedSrcPaths) {
    if (checkExistsSameFile(srcParsePath, toPath)) return true;
  }
  return false;
}

function checkExistsSameFile(srcPath: ParsedPath, toPath: string) {
  return fse.pathExistsSync(toPath + "/" + srcPath.base) && !checkParentSameName(srcPath, toPath);
}

function checkParentSameName(srcPath: ParsedPath, toPath: string) {
  return srcPath.dir === toPath + "/" + srcPath.base;
}

function checkMoveToItself(srcPath: ParsedPath, toPath: string) {
  return srcPath.dir === toPath;
}

function checkMoveToSubdirectory(srcPath: ParsedPath, toPath: string) {
  return (
    toPath.includes(srcPath.dir + "/" + srcPath.base) ||
    path.resolve(toPath).includes(path.resolve(srcPath.dir + srcPath.base))
  );
}

//start send file
export const getItemAndSend = async (action: ActionType, toPath = ""): Promise<boolean> => {
  const { selectedFile, selectedFolder } = await getSelectedItemPath();
  if (isEmpty(toPath)) {
    toPath = await getChooseFolder()
      .then(async (_path) => {
        await open("raycast://");
        return _path;
      })
      .catch(async () => {
        await open("raycast://");
        return "";
      });
  }

  if (isEmpty(toPath)) {
    await showToast(Toast.Style.Failure, "Error!", "Path is invalid.");
    return false;
  }

  //pre check
  if (selectedFile.length === 0 && selectedFolder.length === 0) {
    await showToast(Toast.Style.Failure, "Error!", "Nothing is selected.");
    return false;
  }
  const parentFolderPath = selectedFile.length === 0 ? selectedFolder[0].dir : selectedFile[0].dir;

  if (toPath === parentFolderPath || path.resolve(parentFolderPath) === path.resolve(toPath)) {
    await showToast(Toast.Style.Failure, "Error!", `Cannot ${action} a directory to itself.`);
    return false;
  }

  if (selectedFolder.length === 1 && selectedFile.length === 0 && checkMoveToSubdirectory(selectedFolder[0], toPath)) {
    await showToast(Toast.Style.Failure, "Error!", `Cannot ${action} folder to a subdirectory of itself.`);
    return false;
  }

  if (selectedFolder.length === 1 && selectedFile.length === 0 && checkParentSameName(selectedFolder[0], toPath)) {
    await showToast(Toast.Style.Failure, "Error!", `Cannot replace folder by the items it contains.`);
    return false;
  }

  // move or copy
  const operationResult = await sendFileShowAlert(selectedFile, selectedFolder, toPath, action);
  if (!operationResult.isCancel) {
    try {
      if (getPreferenceValues<Preferences>().deleteEmptyDirectory && checkDirectoryEmpty(parentFolderPath)) {
        fse.removeSync(parentFolderPath);
      }
    } catch (e) {
      console.error(String(e));
    }
    await followUpWork(operationResult.sendResult, toPath, action);
    return true;
  } else {
    return false;
  }
};

//show alert
export async function sendFileShowAlert(
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  destPath: string,
  action: ActionType
) {
  let sendResult: { isSuccess: boolean; srcPath: ParsedPath }[] = [];
  let isCancel = false;
  //check if file and folder exists
  if (checkExistsSameFiles(destPath, selectedFile) || checkExistsSameFiles(destPath, selectedFolder)) {
    const options: Alert.Options = {
      title: "⚠️ Overwrite",
      message: "Files or folders already exist in the destination path. Do you want to overwrite?",
      primaryAction: {
        title: "Overwrite All",
        onAction: () => {
          sendResult = sendFileTo(selectedFile, selectedFolder, destPath, action);
        },
      },
      dismissAction: {
        title: "Cancel",
        onAction: () => {
          isCancel = true;
        },
      },
    };
    await confirmAlert(options);
  } else {
    // move file
    sendResult = sendFileTo(selectedFile, selectedFolder, destPath, action);
  }

  return { isCancel: isCancel, sendResult: sendResult };
}

export function sendFileTo(
  selectedFile: ParsedPath[],
  selectedFolder: ParsedPath[],
  destPath: string,
  action: ActionType,
  overwrite = true
) {
  const sendResult: { isSuccess: boolean; srcPath: ParsedPath }[] = [];
  switch (action) {
    case ActionType.COPY: {
      selectedFile.forEach((value) => {
        sendResult.push(fseCopyItem(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite));
      });
      selectedFolder.forEach((value) => {
        sendResult.push(fseCopyItem(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite));
      });
      return sendResult;
    }
    case ActionType.MOVE: {
      selectedFile.forEach((value) => {
        sendResult.push(fseMoveItem(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite));
      });
      for (const value of selectedFolder) {
        sendResult.push(fseMoveItem(value.dir + "/" + value.base, destPath + "/" + value.base, overwrite));
      }
      return sendResult;
    }
  }
}

//end work
const followUpWork = async (
  moveResult: { isSuccess: boolean; srcPath: ParsedPath }[],
  destPath: string,
  action: ActionType
) => {
  try {
    const successResult = moveResult.filter((item) => item.isSuccess);
    const failedResult = moveResult.filter((item) => !item.isSuccess);
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: `${action == ActionType.MOVE ? "Moved" : "Copied"} successfully!`,
      message: `${successResult.length} item${successResult.length > 1 ? "s" : ""} success, ${
        failedResult.length
      } item${failedResult.length > 1 ? "s" : ""} failure.`,
      primaryAction: {
        title: "Open Folder",
        onAction: (toast) => {
          open(destPath);
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Show Folder",
        onAction: (toast) => {
          showInFinder(destPath);
          toast.hide();
        },
      },
    };

    await showToast(options);

    if (getPreferenceValues<Preferences>().openDestDirectory) {
      await showHUD(
        `${action == ActionType.MOVE ? "Moved" : "Copied"} successfully, Open ${path.parse(destPath).base}`
      );
      await open(destPath);
    }
  } catch (e) {
    console.error(String(e));
  }
};

//utils
export function fseCopyItem(src: string, dest: string, overwrite: boolean) {
  const parseSrc = path.parse(src);
  const parseDest = path.parse(dest);
  try {
    if (
      checkParentSameName(parseSrc, parseDest.dir) ||
      checkMoveToSubdirectory(parseSrc, parseDest.dir) ||
      checkMoveToItself(parseSrc, parseDest.dir)
    ) {
      return { isSuccess: false, srcPath: parseSrc };
    }

    // SOLUTION for Error: Cannot copy. solution for a subdirectory of itself,
    if (fse.pathExistsSync(dest)) {
      fseCopySyncFix(src, dest);
    } else {
      fse.copySync(src, dest, { overwrite: overwrite, recursive: true });
    }

    return { isSuccess: true, srcPath: parseSrc };
  } catch (e) {
    console.error(String(e));
    return { isSuccess: false, srcPath: parseSrc };
  }
}

export function fseMoveItem(src: string, dest: string, overwrite: boolean) {
  try {
    if (
      checkParentSameName(path.parse(src), path.dirname(dest)) ||
      checkMoveToSubdirectory(path.parse(src), path.dirname(dest)) ||
      checkMoveToItself(path.parse(src), path.dirname(dest))
    ) {
      return { isSuccess: false, srcPath: path.parse(src) };
    }
    fse.moveSync(src, dest, { overwrite: overwrite });
    return { isSuccess: true, srcPath: path.parse(src) };
  } catch (e) {
    console.error(String(e));
    return { isSuccess: false, srcPath: path.parse(src) };
  }
}

// SOLUTION for Error: Cannot copy. solution for a subdirectory of itself,
export function fseCopySyncFix(sourceDir: string, destinationDir: string) {
  try {
    fse.rmSync(destinationDir, { recursive: true });
  } catch (e) {
    console.error(String(e));
  }
  try {
    fse.copySync(sourceDir, destinationDir, { overwrite: true, recursive: true });
  } catch (e) {
    console.error(String(e));
  }
}
