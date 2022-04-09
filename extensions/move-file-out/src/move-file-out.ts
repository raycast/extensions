import { checkDirectoryEmpty, preferences } from "./utils";
import { open, showHUD, showToast, Toast } from "@raycast/api";
import { ActionType, getSelectedItemPath, moveFileShowAlert, moveOrCopyFileAndFolder } from "./move-file-utils";
import path from "path";
import fs from "fs-extra";

export default async () => {
  await commonAction(ActionType.move);
};

export async function commonAction(action: ActionType): Promise<void> {
  const toast = await showToast(Toast.Style.Animated, `${action == ActionType.move ? "Moving" : "Copying"}`);
  const { selectedFile, selectedFolder } = await getSelectedItemPath();
  if (selectedFile.length === 0 && selectedFolder.length === 0) {
    await showHUD("Nothing is selected");
    return;
  }
  const parentFolderPath = selectedFile.length === 0 ? selectedFolder[0].dir : selectedFile[0].dir;
  const _destPath = parentFolderPath.substring(0, parentFolderPath.lastIndexOf("/"));

  //check if the parent folder is writable
  if (!fs.pathExistsSync(_destPath)) {
    await showHUD("Parent Path is valid");
    return;
  }

  if (preferences().disableWarning) {
    const moveResult = moveOrCopyFileAndFolder(selectedFile, selectedFolder, parentFolderPath, _destPath, true, action);
    if (moveResult.isParentSameFolder && selectedFile.length + selectedFolder.length == 1) {
      await showHUD(
        `Nothing is ${action == ActionType.move ? "moved" : "copied"}, ${path.parse(parentFolderPath).base} is ignored`
      );
      return;
    }
    if (moveResult.isParentSameFolder) {
      await showHUD(
        `Files are ${action == ActionType.move ? "moved" : "copied"} to ${path.parse(_destPath).base}, ${
          path.parse(parentFolderPath).base
        } is ignored`
      );
    } else {
      await showHUD(`Files are ${action == ActionType.move ? "moved" : "copied"} to ${path.parse(_destPath).base}`);
    }
    if (preferences().openDestDirectory) {
      await open(_destPath);
    }
  } else {
    const moveResult = await moveFileShowAlert(selectedFile, selectedFolder, parentFolderPath, _destPath, action);
    if (moveResult.isParentSameFolder && selectedFile.length + selectedFolder.length == 1) {
      await showHUD(
        `Nothing is ${action == ActionType.move ? "moved" : "copied"} to ${path.parse(_destPath).base}, ${
          path.parse(parentFolderPath).base
        } is ignored`
      );
      return;
    }
    if (moveResult.isMoved) {
      if (moveResult.isParentSameFolder) {
        await showHUD(
          `Files are ${action == ActionType.move ? "moved" : "copied"} to ${path.parse(_destPath).base}, ${
            path.parse(parentFolderPath).base
          } is ignored`
        );
      } else {
        await showHUD(`Files are ${action == ActionType.move ? "moved" : "copied"} to ${path.parse(_destPath).base}`);
      }
      if (preferences().openDestDirectory) {
        await open(_destPath);
      }
    } else {
      await showHUD("Operation is cancelled");
    }
  }

  if (preferences().deleteEmptyDirectory && checkDirectoryEmpty(parentFolderPath)) {
    fs.removeSync(parentFolderPath);
  }
  await toast.hide();
}
