import {
  getArgument,
  getPathFromSelectionOrClipboard,
  isStartWithFileOrFolderStr,
  showHud,
} from "./utils/common-utils";
import fse from "fs-extra";
import { homedir } from "os";
import { filePathAction, openPathInTerminal, urlPathAction } from "./utils/path-utils";
import { closeMainWindow, getFrontmostApplication, LaunchProps, open, updateCommandMetadata } from "@raycast/api";
import validator, { isEmpty } from "validator";
import { OpenIn, OpenInArguments, priorityDetection, trimText } from "./types/preference";
import { getFinderPath } from "./utils/applescript-utils";

export default async (props: LaunchProps<{ arguments: OpenInArguments }>) => {
  await closeMainWindow();
  const openIn_ = getArgument(props.arguments.openIn, `OpenIn`);
  const openIn = isEmpty(openIn_) ? OpenIn.FINDER : openIn_;

  // Update metadata
  await updateCommandMetadata({ subtitle: validator.isEmpty(openIn) ? OpenIn.FINDER : openIn });

  const frontmostApp = await getFrontmostApplication();
  if (openIn === OpenIn.TERMINAL && frontmostApp.name === "Finder") {
    const finderPath = await getFinderPath();
    await openPathInTerminal(finderPath);
    return;
  }

  const _getText = await getPathFromSelectionOrClipboard(priorityDetection);
  const path = trimText ? _getText.trim() : _getText;

  if (validator.isEmpty(path)) {
    await showHud("⭕️", "Nothing detected");
    return;
  }

  // Open file, folder
  const filePath = path.startsWith("~/") ? path.replace("~", homedir()) : path;
  if (fse.pathExistsSync(filePath)) {
    if (validator.isEmpty(openIn) || openIn === OpenIn.FINDER) {
      await filePathAction(filePath);
    } else if (openIn === OpenIn.TERMINAL) {
      await openPathInTerminal(filePath);
    }
    return;
  } else if (isStartWithFileOrFolderStr(path)) {
    await showHud("🚨", "Error Path: " + path);
    return;
  }

  //Open IP
  if (validator.isIP(path)) {
    if (path.startsWith("127.0.0.1")) {
      await open("http://www." + path);
    } else {
      await open("http://" + path);
    }
    await showHud("🅿️", "Open IP: " + path);
    return;
  }

  // Open Email
  if (validator.isEmail(path) || validator.isMailtoURI(path)) {
    let email = path;
    if (path.startsWith("mailto:")) {
      email = path.replace("mailto:", "");
    }
    await showHud("📧", "Send Email: " + email);
    await open("mailto:" + email);
    return;
  }

  // Open Url or Search Text
  await urlPathAction(path);
};
