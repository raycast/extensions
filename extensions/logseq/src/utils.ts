import { getPreferenceValues } from "@raycast/api";
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
    if (!stats.isDirectory) {
      throw "invalid";
    }
  });
};

const buildJournalPath = (graphPath: string) => {
  const addEndingSlashIfNeed = R.ifElse(R.endsWith("/"), R.identity, appendStr("/"));
  return [addEndingSlashIfNeed(graphPath), "journals/", dayjs().format("YYYY_MM_DD"), ".md"].join("");
};

export const getTodayJournalPath = () => {
  return buildJournalPath(getPreferenceValues().graphPath);
};

export const createFileIfNotExist = (filePath: string) => {
  return fs.promises.access(filePath).catch((e) => {
    if (e.code === "ENOENT") {
      return fs.promises.writeFile(filePath, "");
    }

    throw e;
  });
};
