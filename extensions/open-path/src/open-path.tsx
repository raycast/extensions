import { getPreferenceValues, open } from "@raycast/api";
import {
  getPathFromSelectionOrClipboard,
  isEmail,
  isEmpty,
  isFileOrFolderPath,
  isIPUrlWithoutHttp,
  Preference,
  showHud,
} from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";
import { isIP, isIPv4 } from "net";
import { filePathOperation, OpenURL } from "./utils/path-utils";

export default async () => {
  const { trimText, fileOperation, priorityDetection, searchEngine } = getPreferenceValues<Preference>();

  const _getText = await getPathFromSelectionOrClipboard(priorityDetection);
  const path = trimText ? _getText.trim() : _getText;

  if (isEmpty(path)) {
    await showHud("⭕️", "Nothing detected");
    return;
  }

  // Open file, folder
  if (fse.pathExistsSync(path)) {
    await filePathOperation(path, fileOperation);
    return;
  }
  // open ~/file, ~/folder
  const homedirPath = path.startsWith("~/") ? path.replace("~", homedir()) : path;
  if (fse.pathExistsSync(homedirPath)) {
    await filePathOperation(homedirPath, fileOperation);
    return;
  }
  // Re-judge, if path is similar to file path and does not exist then error is reported
  if (isFileOrFolderPath(path)) {
    await showHud("🚫", "Error Path: " + path);
    return;
  }

  //Open IP
  if (isIP(path) !== 0 || isIPUrlWithoutHttp(path)) {
    if (path.startsWith("127.0.0.1")) {
      await open("http://www." + path);
    } else {
      await open("http://" + path);
    }
    console.info("open: IP " + path);
    await showHud("🔗", "Open IP: " + path);
    return;
  }

  // Open Email
  if (isEmail(path)) {
    await open("mailto:" + path);
    console.info("open: email " + path);
    await showHud("📧", "Send Email: " + path);
    return;
  }
  // Open Email(mailto:)
  if (path.startsWith("mailto:")) {
    await open(path);
    console.info("open: email " + path);
    await showHud("📧", "Send Email: " + path);
    return;
  }

  // Open Url or Search Text
  await OpenURL(fileOperation, path, searchEngine);
};
