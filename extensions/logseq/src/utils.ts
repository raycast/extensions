import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { parseEDNString } from "edn-data";
import path from "path";
import * as R from "ramda";
import dayjs from "dayjs";
import fs from "fs";
import untildify from "untildify";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};
export const prependStr = (leading: string) => (val: string) => leading + val;
export const appendStr = (toAppend: string) => (val: string) => val + toAppend;

export const generateContentToAppend = (content: string, isOrgMode: boolean) => {
  const leadingStr = isOrgMode ? "\n* " : "\n- ";
  return R.compose(prependStr(leadingStr), R.replace(/\n/g, leadingStr))(content);
};

const validateFolderPath = (folder: string) => {
  return fs.promises
    .lstat(folder)
    .then((stats) => {
      if (!stats.isDirectory()) {
        throw `Folder does not exist: ${folder}`;
      }
    })
    .catch((e) => {
      if (e.code === "ENOENT") {
        throw `Folder does not exist: ${folder}`;
      } else {
        throw `Error`;
      }
    });
};

export const getUserConfiguredGraphPath = () => {
  return untildify(getPreferenceValues().graphPath);
};

export const validateUserConfigGraphPath = () => {
  return validateFolderPath(getUserConfiguredGraphPath());
};

const parseJournalFileNameFromLogseqConfig = () => {
  const logseqConfigPath = path.join(getUserConfiguredGraphPath(), "/logseq/config.edn");
  return (
    fs.promises
      .readFile(logseqConfigPath, { encoding: "utf8" })
      .then((content) => parseEDNString(content.toString(), { mapAs: "object", keywordAs: "string" }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((v: any) => ({
        fileFormat: v["preferred-format"] === "org" ? ".org" : ".md",
        journalsDirectory: v["journals-directory"] || "journals",
        dateFormat: (v["journal/file-name-format"] || "YYYY_MM_DD").toUpperCase(),
      }))
  );
};

const buildJournalPath = (graphPath: string) => {
  return parseJournalFileNameFromLogseqConfig().then(({ dateFormat, journalsDirectory, fileFormat }) =>
    path.join(graphPath, journalsDirectory, `${dayjs().format(dateFormat)}${fileFormat}`)
  );
};

export const getTodayJournalPath = () => {
  return buildJournalPath(getUserConfiguredGraphPath());
};

const createFileIfNotExist = (filePath: string) => {
  return fs.promises.access(filePath).catch((e) => {
    if (e.code === "ENOENT") {
      return fs.promises.writeFile(filePath, "");
    }

    throw e;
  });
};

export const showGraphPathInvalidToast = () => {
  showToast({
    style: Toast.Style.Failure,
    title: "Logseq graph path is invalid",
    message: "Update the path and try again.",
  });
};

export const appendContentToFile = (content: string, filePath: string) => {
  const isOrgMode = filePath.endsWith(".org");
  return validateFolderPath(path.dirname(filePath))
    .then(() => createFileIfNotExist(filePath))
    .then(() => fs.promises.appendFile(filePath, generateContentToAppend(content, isOrgMode)));
};

export const getFilesInDir = async (dirPath: string) => {
  return fs.promises.readdir(dirPath).then((files) => files.map((file) => path.join(dirPath, file)));
};

export const formatResult = (result: string) => {
  const title = result.split("/");
  return title[title.length - 1];
};

export const formatFilePath = (pageName: string) => {
  const dbName = getUserConfiguredGraphPath().split("/")[getUserConfiguredGraphPath().split("/").length - 1];
  const finalURL = encodeURI(`logseq://graph/${dbName}?file=${pageName}`);
  return finalURL;
};
