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

const getUserConfiguredGraphPath = () => {
  return untildify(getPreferenceValues().graphPath);
};

export const validateUserConfigGraphPath = () => {
  return fs.promises.lstat(getUserConfiguredGraphPath()).then((stats) => {
    if (!stats.isDirectory()) {
      throw "invalid";
    }
  });
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
    title: "Logseq graph path is invalid. Update it in Raycast Preferences and retry.",
  });
};

export const appendContentToFile = (content: string, filePath: string) => {
  const isOrgMode = filePath.endsWith(".org");
  return createFileIfNotExist(filePath).then(() =>
    fs.promises.appendFile(filePath, generateContentToAppend(content, isOrgMode))
  );
};
