import {
  closeMainWindow,
  getPreferenceValues,
  launchCommand,
  LaunchProps,
  LaunchType,
  open,
  showHUD,
  showInFinder,
} from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item-utils";
import { Preferences } from "./types/preferences";
import { createNewFileWithText, getFinderPath, getNewFileType, isEmpty } from "./utils/common-utils";

interface NewFileWithTextArguments {
  fileName: string;
  fileContent: string;
}

export default async (props: LaunchProps<{ arguments: NewFileWithTextArguments }>) => {
  const { fileName, fileContent } = props.arguments;
  const { createdAction, nullArgumentsAction, defaultFileType, defaultFileContent } =
    getPreferenceValues<Preferences>();
  if (isEmpty(fileName) && isEmpty(fileContent) && nullArgumentsAction === "createWithTemplate") {
    await launchCommand({
      name: "new-file-with-template",
      type: LaunchType.UserInitiated,
      context: { navigationTitle: "New File Now" },
    });
    return;
  }
  await closeMainWindow();
  const inputFileType = getNewFileType(fileName ? fileName : defaultFileType);

  try {
    const curFinderPath = await getFinderPath();
    let autoContent = "";
    switch (defaultFileContent) {
      case "empty": {
        autoContent = "";
        break;
      }
      case "selectedFirst": {
        autoContent = await fetchItemInputSelectedFirst();
        break;
      }
      case "clipboardFirst": {
        autoContent = await fetchItemInputClipboardFirst();
        break;
      }
    }
    const inputText = fileContent ? fileContent : autoContent;

    const createdFile = await createNewFileWithText(
      inputFileType ? inputFileType.extension : defaultFileType,
      curFinderPath,
      inputText,
      !isEmpty(fileName)
        ? inputFileType
          ? inputFileType.name
          : fileName
        : inputText.replaceAll(".", "_").substring(0, 10),
    );
    switch (createdAction) {
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

    await showHUD(`📄 ${createdFile.fileName} created in ${curFinderPath}`);
  } catch (e) {
    await showHUD("❌ " + String(e));
    console.error(String(e));
  }
};
