import fse from "fs-extra";
import type { RequestInit } from "node-fetch";
import fetch, { FetchError } from "node-fetch";
import https from "node:https";

import { Toast, getPreferenceValues, open, showHUD, showInFinder, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import type { BookEntry } from "@/types";
import type { LibgenPreferences } from "@/types";

import { parseLowerCaseArray } from "./common";
import { languages } from "./constants";
import { showActionToast, showFailureToast } from "./toast";

const fetchImageArrayBuffer = async (url: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
  const requestInit: RequestInit = {
    method: "GET",
    signal: signal,
  };
  const { allowIgnoreHTTPSErrors } = getPreferenceValues<LibgenPreferences>();
  if (allowIgnoreHTTPSErrors) {
    requestInit.agent = new https.Agent({
      rejectUnauthorized: false,
    });
  }
  const res = await fetch(url, requestInit);
  const buffer = await res.arrayBuffer();
  return buffer;
};

export const sortBooksByPreferredLanguages = (books: BookEntry[], preferredLanguages: string) => {
  // parse the languages to a list in lower case
  const preferredLanguageList = parseLowerCaseArray(preferredLanguages);

  // keep only accept languages that are in the list of supported languages
  const filteredPreferredLanguageList = preferredLanguageList.filter((pl) =>
    languages.map((l) => l.name.toLowerCase()).includes(pl),
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

  console.log("Download", downloadPath, name, extension);

  const toast = await showActionToast({
    title: "Downloading...",
    cancelable: true,
  });
  try {
    const fileName = buildFileName(downloadPath, name, extension);
    const filePath = `${downloadPath}/${fileName}`;

    const arrayBuffer = await fetchImageArrayBuffer(url, toast.signal);
    console.log(url, arrayBuffer.byteLength / 1024, "KB");

    fse.writeFileSync(filePath, Buffer.from(arrayBuffer));

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
    if (err instanceof FetchError && err.code === "CERT_HAS_EXPIRED") {
      await showFailureToast(
        "Download Failed",
        new Error(
          "The certificate has expired. Try with a different download gateway or enable 'Ignore HTTPS Errors' in your settings.",
        ),
      );
      return;
    }
    await showFailureToast("Download Failed", err as Error);
  }
}

export async function downloadBookToLocation(url = "", book: BookEntry) {
  const fileName = fileNameWithExtensionFromBookEntry(book);
  await showToast(Toast.Style.Animated, "Please pick a folder...");
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
