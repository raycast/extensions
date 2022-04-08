import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { parseEDNString } from "edn-data";
import path from "path";
import * as R from "ramda";
import dayjs from "dayjs";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};
export const prependStr = (leading: string) => (val: string) => leading + val;
export const appendStr = (toAppend: string) => (val: string) => val + toAppend;

export const generateContentToAppend = R.compose(prependStr("\n- "), R.replace(/\n/g, "\n- "));

export const validateUserConfigGraphPath = () => {
  return fs.promises.lstat(getPreferenceValues().graphPath).then((stats) => {
    if (!stats.isDirectory()) {
      throw "invalid";
    }
  });
};

const parseJournalFileNameFromLogseqConfig = () => {
  const logseqConfigPath = path.join(getPreferenceValues().graphPath, "/logseq/config.edn");
  return (
    fs.promises
      .readFile(logseqConfigPath, { encoding: "utf8" })
      .then((content) => parseEDNString(content.toString(), { mapAs: "object", keywordAs: "string" }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((v: any) => (v["journal/file-name-format"] || "YYYY_MM_DD").toUpperCase())
  );
};

const buildJournalPath = (graphPath: string) => {
  return parseJournalFileNameFromLogseqConfig().then((dateFormat) =>
    path.join(graphPath, "/journals/", `${dayjs().format(dateFormat)}.md`)
  );
};

export const getTodayJournalPath = () => {
  return buildJournalPath(getPreferenceValues().graphPath);
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
    title: "Logseq graph path is invalid. Update it in Raycast Preferences and retry.",
  });
};

export const appendContentToFile = (content: string, filePath: string) => {
  return createFileIfNotExist(filePath).then(() => fs.promises.appendFile(filePath, generateContentToAppend(content)));
};
