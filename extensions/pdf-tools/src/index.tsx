import {
  showToast,
  Toast,
  showHUD,
  getSelectedFinderItems,
  List,
  Icon,
  ActionPanel,
  Action,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { TaskUpload } from "./lib/cloudcovertUpload";
import DropdownComponent from "./component/DropdownComponent";

let allFilesSupported = true; // Global flag set to true by default

interface Preferences {
  APIKey: string;
  CloseWindow: boolean;
}

const { APIKey, CloseWindow } = getPreferenceValues<Preferences>();

interface AllowedFiles {
  convert: string[];
  compress: string[];
}

export default function Command(task: string) {
  const [markdown, setMarkdown] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filePath, setFilePath] = useState<string[] | null>(null);
  const [compressVal, setCompressVal] = useState("max");

  useEffect(() => {
    getSelectedItemFromFinder().then((filePaths) => {
      if (filePaths) {
        setFilePath(filePaths);
        let modifiedResult = filePaths
          .map((item) => {
            const parts = item.split("/");
            return parts[parts.length - 1]; // Get last part after splitting by '/' ,display to user the file name 
          })
          .filter((fileName) => fileName);

        setMarkdown(modifiedResult);
        setIsLoading(false);
      } else {
        console.error("No file paths available");
        setIsLoading(false);
      }
    });
  }, []);

  const taskKey: keyof AllowedFiles = task as keyof AllowedFiles; // Set taskKey to the key "convert" or "compress" as needed

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={task === "compress" ? <DropdownComponent setCompressVal={setCompressVal} /> : null}
    >
      {markdown &&
        markdown.map((item, index) => {
          const extension = item.split(".").pop() || "";
          const isSupportedExtension = isSupported(extension, taskKey);

          return (
            <List.Item
              key={index}
              title={item}
              icon={isSupportedExtension ? Icon.Dot : Icon.Xmark}
              // subtitle={isSupportedExtension ? "supported file" : "unsupported file"}
              accessories={[{ icon: setSvg(extension) }, { text: extension }]}
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Upload to CloudConvert"
                    onSubmit={({}) => uploadFile(filePath, task, extension, compressVal)}
                    icon={Icon.Upload}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      <List.EmptyView
        icon={{ source: "../assets/svg/noFile.svg" }}
        title="You need to choose files"
        description="pdf, pptx, docx ...."
      />
    </List>
  );
}

async function getSelectedItemFromFinder() {
  try {
    const fileList = await getSelectedFinderItems();
    return fileList.map((f) => f.path);
  } catch (error) {
    console.error("Error retrieving selected files:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: String(error),
    });
    return [];
  }
}

function setSvg(fileExtension: string) {
  const fileIcons: Record<string, string> = {
    doc: "../assets/svg/doc.svg",
    docx: "../assets/svg/doc.svg",
    pptx: "../assets/svg/ppt.svg",
    ppt: "../assets/svg/ppt.svg",
    pdf: "../assets/svg/pdf.svg",
    default: "../assets/svg/default.svg",
  };

  const iconSource = fileIcons[fileExtension] || fileIcons.default;
  return { source: iconSource };
}

function isSupported(fileExtension: string, task: keyof AllowedFiles): boolean {
  const allowedFiles: AllowedFiles = {
    convert: ["ppt", "pptx", "doc", "docx", "xls", "xlsx"],
    compress: ["pdf"],
  };

  const supportedFiles = allowedFiles[task];
  const isSupported = supportedFiles.includes(fileExtension);

  if (!isSupported) {
    allFilesSupported = false;
  }

  return isSupported;
}

const uploadFile = async (filePaths: any, task: string, extension: string, compressVal: string) => {
  if (allFilesSupported == false) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unsupported file detected ",
      message: "Please change your file to continue",
    });
    return;
  }

  const taskType = task === "convert" ? "Converting" : "Compressing";
  const taskMessage = `your file is now being ${taskType}. This process may take some time.`;

  await showToast({
    style: Toast.Style.Animated,
    title: `${taskType}...`,
    message: String(taskMessage),
  });

  const converter = new TaskUpload();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    await converter.convertFileTaskExecuter(APIKey, filePath, task, extension, compressVal);
    await showToast({
      style: Toast.Style.Animated,
      title: `${taskType}...`,
      message: `Finished ${i + 1} / ${filePaths.length}`,
    });
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Finished all",
    message: "Have a nice day!",
  });

  if (CloseWindow) {
    await closeMainWindow(); // Close Raycast window
  }

  await showHUD("Finished all");
};
