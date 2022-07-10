import { getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { fetchItemInputSelectedFirst } from "./utils/input-item-utils";
import { Preferences } from "./types/preferences";
import { createNewFileWithText, getSavedDirectory, isEmpty } from "./utils/common-utils";

export default async () => {
  const { createdActions, fileType, saveDirectory } = getPreferenceValues<Preferences>();

  try {
    const inputText = await fetchItemInputSelectedFirst();
    const finalSaveDirectory = getSavedDirectory(saveDirectory);

    const createdFile = await createNewFileWithText(
      fileType,
      finalSaveDirectory,
      inputText,
      isEmpty(inputText) ? "" : inputText.substring(0, 10)
    );
    switch (createdActions) {
      case "no": {
        break;
      }
      case "open": {
        await open(createdFile.filePath);
        break;
      }
      case "show": {
        await showInFinder(createdFile.filePath);
      }
    }

    await showHUD(
      `${createdFile.fileName}${
        isEmpty(inputText) ? " with empty content" : " " + inputText.substring(0, 10)
      } created in ${finalSaveDirectory}`
    );
  } catch (e) {
    await showHUD(String(e));
    console.error(String(e));
  }
};
