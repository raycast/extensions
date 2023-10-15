import fse from "fs-extra";
import { BookEntry } from "../types";
import { languages } from "./constants";
import { join } from "path";
import { homedir } from "os";
import { runAppleScript } from "run-applescript";
import { LibgenPreferences } from "../types";

import {
  Clipboard,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import Style = Toast.Style;
import { axiosGetImageArrayBuffer } from "./axios-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const parseLowerCaseArray = (string: string) => {
  return string
    .toLowerCase()
    .split(",")
    .map((item) => item.trim());
};

// https://stackoverflow.com/questions/10003683/how-can-i-extract-a-number-from-a-string-in-javascript
export const extractNumber = (string: string, index = 0) => {
  const numbers = string.match(/\d+/);
  return numbers ? numbers[index] : string; // replace all leading non-digits with nothing
};

export const resolveHome = (filepath: string) => {
  if (filepath[0] === "~") {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
};

export const sortBooksByPreferredLanguages = (books: BookEntry[], preferredLanguages: string) => {
  // parse the languages to a list in lower case
  const preferredLanguageList = parseLowerCaseArray(preferredLanguages);

  // keep only accept languages that are in the list of supported languages
  const filteredPreferredLanguageList = preferredLanguageList.filter((pl) =>
    languages.map((l) => l.name.toLowerCase()).includes(pl)
  );

  // generate a weight table based on the order of languages
  const languageWeights: { [language: string]: number } = {};
  filteredPreferredLanguageList.forEach((pl, i) => {
    languageWeights[pl] = filteredPreferredLanguageList.length - i;
  });

  // sort books based on the language weight
  books.sort((a, b) => {
    // some books contains more than one languages in the attribute
    const languagesA = parseLowerCaseArray(a.language);
    // add up weights for all languages
    const weightA = languagesA.map((l) => (l in languageWeights ? languageWeights[l] : 0)).reduce((p, c) => p + c, 0);

    const languagesB = parseLowerCaseArray(b.language);
    const weightB = languagesB.map((l) => (l in languageWeights ? languageWeights[l] : 0)).reduce((p, c) => p + c, 0);

    return weightB - weightA;
  });

  return books;
};

export const sortBooksByPreferredFileFormats = (books: BookEntry[], preferredFormats: string) => {
  // parse the formats to a list in lower case
  const preferredFormatList = parseLowerCaseArray(preferredFormats);
  // generate a weight table based on the order of formats
  const formatWeights: { [format: string]: number } = {};
  preferredFormatList.forEach((pf, i) => {
    formatWeights[pf] = preferredFormatList.length - i;
  });

  // sort books based on the format weight
  books.sort((a, b) => {
    // https://stackoverflow.com/questions/20864893/replace-all-non-alphanumeric-characters-new-lines-and-multiple-white-space-wit
    // clean up the file format string
    const extensionA = a.extension.replace(/[\W_]+/g, "");
    const weightA = extensionA in formatWeights ? formatWeights[extensionA] : 0;

    const extensionB = b.extension.replace(/[\W_]+/g, "");
    const weightB = extensionB in formatWeights ? formatWeights[extensionB] : 0;

    return weightB - weightA;
  });

  return books;
};

export const fileNameFromBookEntry = ({ title, author, year }: BookEntry) => {
  return `${author} - ${title}${year && " (" + year + ")"}`.replace(/\//g, ""); // remove slashes
};

export const fileNameWithExtensionFromBookEntry = (book: BookEntry) => {
  const fileName = fileNameFromBookEntry(book);
  return fileName + "." + book.extension.toLowerCase();
};

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

export async function downloadBookToDefaultDirectory(url = "", book: BookEntry) {
  const { downloadPath } = getPreferenceValues<LibgenPreferences>();
  const name = fileNameFromBookEntry(book);
  const extension = book.extension.toLowerCase();

  const toast = await showToast(Style.Animated, "Downloading...");
  try {
    const fileName = buildFileName(downloadPath, name, extension);
    const filePath = `${downloadPath}/${fileName}`;

    fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Success!",
      message: `Saved to ${downloadPath}`,
      primaryAction: {
        title: "Open Book",
        onAction: (toast) => {
          open(filePath);
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Show in finder",
        onAction: (toast) => {
          showInFinder(filePath);
          toast.hide();
        },
      },
    };
    await showToast(options);
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with a different download gateway.";
    }
  }
}

export async function downloadBookToLocation(url = "", book: BookEntry) {
  const fileName = fileNameWithExtensionFromBookEntry(book);
  await showToast(Style.Animated, "Please pick a folder...");
  try {
    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${fileName}"
      set q_temp_folder to quoted form of temp_folder
      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);
    await showHUD("Download Complete.");
  } catch (err) {
    console.error(err);
    await showHUD("Download Failed. Try with a different download gateway.");
  }
}
