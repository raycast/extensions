import {
  fileAction,
  getPathFromSelectionOrClipboard,
  isEmail,
  isEmpty,
  isFileOrFolderPath,
  isIPUrlWithoutHttp,
  priorityDetection,
  showHud,
  trimText,
} from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";
import { isIP } from "net";
import { filePathAction, urlPathAction } from "./utils/path-utils";
import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  const _getText = await getPathFromSelectionOrClipboard(priorityDetection);
  const path = trimText ? _getText.trim() : _getText;

  if (isEmpty(path)) {
    await showHud("⭕️", "Nothing detected");
    return;
  }

  // Open file, folder
  if (fse.pathExistsSync(path)) {
    await filePathAction(path, fileAction);
    return;
  }
  // open ~/file, ~/folder
  const homedirPath = path.startsWith("~/") ? path.replace("~", homedir()) : path;
  if (fse.pathExistsSync(homedirPath)) {
    await filePathAction(homedirPath, fileAction);
    return;
  }
  // Re-judge, if path is similar to file path and does not exist then error is reported
  if (isFileOrFolderPath(path)) {
    await showHud("🚫", "Error Path: " + path);
    return;
  }

  //Open IP
  if (isIP(path) !== 0 || isIPUrlWithoutHttp(path)) {
    await showHud("🔗", "Open IP: " + path);
    if (path.startsWith("127.0.0.1")) {
      await open("http://www." + path);
    } else {
      await open("http://" + path);
    }
    return;
  }

  // Open Email
  if (isEmail(path)) {
    await showHud("📧", "Send Email: " + path);
    await open("mailto:" + path);
    return;
  }
  // Open Email(mailto:)
  if (path.startsWith("mailto:")) {
    await showHud("📧", "Send Email: " + path);
    await open(path);
    return;
  }

  // Open Url or Search Text
  await urlPathAction(path);
};
