import { closeMainWindow, launchCommand, LaunchProps, LaunchType, open, showInFinder, Toast } from "@raycast/api";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "./utils/input-item-utils";
import { createNewFileWithText, getFinderPath, getNewFileType, isEmpty, showCustomHUD } from "./utils/common-utils";
import { createdAction, defaultFileContent, defaultFileType, nullArgumentsAction } from "./types/preferences";
import Style = Toast.Style;

interface NewFileWithTextArguments {
  fileName: string;
  fileContent: string;
}

export default async (props: LaunchProps<{ arguments: NewFileWithTextArguments }>) => {
  const { fileName, fileContent } = props.arguments;
  if (isEmpty(fileName) && isEmpty(fileContent) && nullArgumentsAction === "createWithTemplate") {
    await launchCommand({
      name: "new-file-with-template",
      type: LaunchType.UserInitiated,
      context: { navigationTitle: "New File Now" },
    });
    return;
  }
  await closeMainWindow();
  await showCustomHUD({ title: "Creating...", style: Style.Animated });

  try {
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
    let ext: string | undefined;
    let content = inputText;
    let name = "";
    if (fileName.startsWith(".") && fileName.length > 1) {
      ext = fileName.split(".").length > 1 ? fileName.split(".")[1] : "";
    } else {
      const inputFileType = getNewFileType(fileName ? fileName : defaultFileType);
      ext = inputFileType ? inputFileType.extension : defaultFileType;
      content = inputFileType.inputContent ? inputText : defaultFileContent;
      name = !isEmpty(fileName)
        ? inputFileType
          ? inputFileType.name
          : fileName
        : inputText.replaceAll(".", "_").substring(0, 10);
    }
    const curFinderPath = await getFinderPath();
    const createdFile = await createNewFileWithText(ext, curFinderPath, content, name);
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

    await showCustomHUD({ title: `📄 ${createdFile.fileName} created in ${curFinderPath}` });
  } catch (e) {
    await showCustomHUD({ title: "Failed to create file.", style: Style.Failure });
    console.error(String(e));
  }
};
