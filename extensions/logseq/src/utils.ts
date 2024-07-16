import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getDateForPageWithoutBrackets } from "logseq-dateutils";
import { parseEDNString } from "edn-data";
import path from "path";
import dayjs from "dayjs";
import fs from "fs";
import untildify from "untildify";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};
export const prependStr = (leading: string) => (val: string) => leading + val;
export const appendStr = (toAppend: string) => (val: string) => val + toAppend;

export const generateContentToAppend = (content: string, isOrgMode: boolean) => {
  const newContent = content
    .split("\n")
    .map((line) => {
      const leadingSpacesCount = line.match(/^( *)/)?.[0].length || 0;

      if (isOrgMode) {
        return `${"*".repeat(leadingSpacesCount + 1)} ${line.trimStart()}`;
      } else {
        return `${" ".repeat(leadingSpacesCount)}- ${line.trimStart()}`;
      }
    })
    .join("\n");

  return `\n${newContent}`;
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

const parseLogseqConfig = () => {
  const logseqConfigPath = path.join(getUserConfiguredGraphPath(), "/logseq/config.edn");
  return fs.promises
    .readFile(logseqConfigPath, { encoding: "utf8" })
    .then((content) => parseEDNString(content.toString(), { mapAs: "object", keywordAs: "string" }));
};

export const getPreferredFormat = () => {
  return parseLogseqConfig().then((v: any) => v["preferred-format"] || "md");
};

const parseJournalFileNameFromLogseqConfig = () => {
  return (
    parseLogseqConfig()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((v: any) => ({
        fileFormat: v["preferred-format"] === "org" ? ".org" : ".md",
        journalsDirectory: v["journals-directory"] || "journals",
        dateFormat: v["journal/file-name-format"] || "yyyy_MM_dd",
      }))
  );
};

const buildJournalPath = (graphPath: string) => {
  return parseJournalFileNameFromLogseqConfig().then(({ dateFormat, journalsDirectory, fileFormat }) =>
    path.join(graphPath, journalsDirectory, `${getDateForPageWithoutBrackets(new Date(), dateFormat)}${fileFormat}`)
  );
};

export const getWorkflowStyle = async (): Promise<string> => {
  return await parseLogseqConfig()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((v: any) => v["preferred-workflow"]);
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
  const title = pageName.split("/")[pageName.split("/").length - 1];
  const finalURL = encodeURI(`logseq://graph/${dbName}?page=${title}`);
  return finalURL;
};

const getCurrentTime = () => {
  return dayjs().format("HH:mm");
};

export const addLeadingTimeToContentIfNecessary = (content: string) => {
  let result = content;

  if (getPreferenceValues().addQuickCaptureTag) {
    result = `[[quick capture]]: ` + result;
  }

  if (getPreferenceValues().insertTime) {
    result = `**${getCurrentTime()}** ` + result;
  }

  return result;
};
