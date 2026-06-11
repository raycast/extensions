import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FileInfo, Preferences } from "../types";
import * as sdk from "../lib/everything";
import { getErrorMessage, mapSortPreferenceToSDK } from "../utils/everything-sdk-utils";
import { RequestFlags } from "../lib/everything-constants";

const { useSdk } = getPreferenceValues<Preferences>();

let loadError: Error | null = null;

if (useSdk) {
  try {
    sdk.load();
  } catch (error) {
    if (error instanceof Error) {
      loadError = error;
    } else {
      loadError = new Error("Unknown error loading Everything SDK");
    }
  }
}

export async function searchFilesWithSDK(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  if (loadError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "SDK Not Available",
      message: "Failed to load Everything SDK. Please use CLI mode instead.",
    });
    return [];
  }

  try {
    const maxResultsCount = Number(preferences.maxResults) || 100;
    sdk.setMax(maxResultsCount);

    const sortType = mapSortPreferenceToSDK(preferences.defaultSort);
    sdk.setSort(sortType);

    sdk.setRegex(preferences.useRegex || false);

    const requestFlags =
      RequestFlags.FILE_NAME |
      RequestFlags.PATH |
      RequestFlags.SIZE |
      RequestFlags.DATE_CREATED |
      RequestFlags.DATE_MODIFIED;

    sdk.setRequestFlags(requestFlags);

    sdk.setSearch(searchText);

    const success = await sdk.query();

    if (!success) {
      const errorCode = sdk.getLastError();
      throw new Error(getErrorMessage(errorCode));
    }

    const numResults = sdk.getNumResults();
    const results: FileInfo[] = [];

    for (let i = 0; i < numResults; i++) {
      try {
        const fullPath = sdk.getResultFullPathName(i);
        const fileName = sdk.getResultFileName(i);
        const isDirectory = sdk.isFolderResult(i);

        const sizeValue = !isDirectory ? sdk.getResultSize(i) : null;
        const size = sizeValue !== null ? sizeValue : undefined;

        const dateCreated = sdk.getResultDateCreated(i) ?? undefined;
        const dateModified = sdk.getResultDateModified(i) ?? undefined;

        if (!fullPath || !fileName) {
          console.warn(`Skipping result ${i} due to missing path or filename.`);
          continue;
        }

        results.push({
          name: fileName,
          commandline: fullPath,
          size,
          dateCreated,
          dateModified,
          isDirectory,
        });
      } catch (error) {
        console.error(`Error processing result ${i}:`, error);
      }
    }

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Error Searching Files",
      message: errorMessage,
    });

    return [];
  } finally {
    sdk.reset();
  }
}
