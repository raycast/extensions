import fs from "fs";
import * as XLSX from "xlsx";
import { Action, ActionPanel, Icon, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { checkFileExists, getFinderPath, preferences } from "./utils";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes } from "./file-type";
import { runAppleScript } from "run-applescript";
import NewFileWithName from "./new-file-with-name";

export default function main() {
  const preference = preferences();

  useEffect(() => {
    async function _initRunAppleScript() {
      await runAppleScript("");
    }

    _initRunAppleScript().then();
  }, []);

  return (
    <List isShowingDetail={false} isLoading={false} searchBarPlaceholder={"Search File Type"}>
      {preference.showDocument && (
        <List.Section title={"Document"}>
          {documentFileTypes.map((fileType) => {
            return <FileTypeItem key={fileType.languageId} fileType={fileType} />;
          })}
        </List.Section>
      )}
      {preference.showCode && (
        <List.Section title={"Code"}>
          {codeFileTypes.map((fileType) => {
            return <FileTypeItem key={fileType.languageId} fileType={fileType} />;
          })}
        </List.Section>
      )}
      {preference.showScript && (
        <List.Section title={"Script"}>
          {scriptFileTypes.map((fileType) => {
            return <FileTypeItem key={fileType.languageId} fileType={fileType} />;
          })}
        </List.Section>
      )}
    </List>
  );
}

function FileTypeItem(props: { fileType: FileType }) {
  const { push } = useNavigation();
  const fileType = props.fileType;
  return (
    <List.Item
      icon={{ source: fileType.icon }}
      title={fileType.name}
      actions={
        <ActionPanel>
          <Action
            title={"New File Here"}
            icon={Icon.Finder}
            onAction={async () => {
              try {
                await createNewFile(fileType, await getFinderPath());
              } catch (e) {
                await showToast(Toast.Style.Failure, "Create File Failed", String(e));
              }
            }}
          />
          <Action
            title={"New File with Name"}
            icon={Icon.Document}
            onAction={() => {
              push(<NewFileWithName fileType={fileType} />);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function createFileName(fileType: FileType) {
  const date = new Date();
  const time =
    date.getFullYear() +
    "" +
    (date.getMonth() + 1) +
    "" +
    date.getDate() +
    "" +
    date.getHours() +
    "" +
    date.getMinutes() +
    "" +
    date.getSeconds();
  return fileType.name + "-" + time + fileType.extension;
}

export async function createNewFile(
  fileType: FileType,
  path: string,
  fileName = createFileName(fileType),
  fileContent = ""
) {
  const isExist = await checkFileExists(fileName);
  const filePath = path + fileName;
  if (!isExist) {
    if (fileType.name === "Excel") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, filePath);
    } else {
      fs.writeFileSync(filePath, fileContent);
    }
  }

  const options: Toast.Options = {
    style: isExist ? Toast.Style.Failure : Toast.Style.Success,
    title: isExist ? "File already Exists" : "Create File Success",
    message: "Click to open file",
    primaryAction: {
      title: "Open File",
      onAction: (toast) => {
        open(filePath);
        toast.hide();
      },
    },
    secondaryAction: {
      title: "Reveal in Finder",
      onAction: (toast) => {
        open(path);
        toast.hide();
      },
    },
  };
  await showToast(options);
}
