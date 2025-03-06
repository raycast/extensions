import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import { CommonActions } from "./common";
import {
  renameObject,
  formatFileSize,
  getFileDetailMarkdown,
  downloadObject,
  deleteObject,
  copyObject,
  getObjUrl,
} from "../utils";

function RenameFile(props: { file: IObject; refresh: () => void }) {
  interface FileName {
    name: string;
  }
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function validName(name?: string): boolean {
    if (!name) {
      setNameError("The name should't be empty");
      return false;
    }
    if (name.includes("/")) {
      setNameError("The name can't include /");
      return false;
    }
    return true;
  }

  async function submitRename(values: FileName) {
    if (!validName(values.name)) {
      return;
    }
    try {
      await renameObject(props.file.name, values.name);
      showToast({
        title: "File renamed",
        style: Toast.Style.Success,
      });
      props.refresh();
      pop();
    } catch (error) {
      showToast({
        title: "Failed to rename File",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      navigationTitle="Rename File"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename File" onSubmit={submitRename} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        defaultValue={path.basename(props.file.name)}
        autoFocus
        placeholder="Enter file name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (validName(event.target.value)) {
            dropNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export function FileItem(props: { file: IObject; refresh: () => void; marks: string[] }) {
  return (
    <List.Item
      key={props.file.name}
      id={props.file.name}
      title={path.basename(props.file.name)}
      icon={{ source: "file.svg", tintColor: Color.SecondaryText }}
      accessories={[
        { text: formatFileSize(props.file.size) },
        {
          date: new Date(props.file.lastModified),
          tooltip: `Date added: ${new Date(props.file.lastModified).toLocaleString()}`,
        },
      ]}
      actions={FileItemAction({ file: props.file, refresh: props.refresh, marks: props.marks })}
    />
  );
}

function FileItemAction(props: { file: IObject; refresh: () => void; marks: string[] }) {
  return (
    <ActionPanel>
      <FileCommonActions file={props.file} refresh={props.refresh} />
      <CommonActions
        currentFolder={path.parse(props.file.name).dir}
        file={props.file}
        refresh={props.refresh}
        marks={props.marks}
      />
    </ActionPanel>
  );
}

function FileDetail(props: { file: IObject; refresh: () => void }) {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [urlAclState, updateUrlAclState] = useState<IObjectURLAndACL>();
  const [markdownState, updateMarkdownState] = useState<string>("");
  useEffect(() => {
    init();
  }, []);

  async function init() {
    updateLoadingState(true);
    const urlAcl = await getObjUrl(props.file.name);
    updateUrlAclState(urlAcl);
    const markdown = await getFileDetailMarkdown(props.file, urlAcl.url);
    updateMarkdownState(markdown);
    updateLoadingState(false);
  }
  return (
    <Detail
      isLoading={isLoadingState}
      navigationTitle={props.file.name}
      markdown={markdownState}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Name">
            <Detail.Metadata.TagList.Item text={path.basename(props.file.name)} color={Color.Blue} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Kind">
            <Detail.Metadata.TagList.Item
              text={path.extname(props.file.name).substring(1).toUpperCase()}
              color={Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Size">
            <Detail.Metadata.TagList.Item text={formatFileSize(props.file.size)} color={Color.PrimaryText} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Date added">
            <Detail.Metadata.TagList.Item
              text={new Date(props.file.lastModified).toLocaleString()}
              color={Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="ACL">
            <Detail.Metadata.TagList.Item text={urlAclState?.acl || "unknown"} color={Color.PrimaryText} />
          </Detail.Metadata.TagList>
          {urlAclState?.bucketAcl && (
            <Detail.Metadata.TagList title="Bucket ACL">
              <Detail.Metadata.TagList.Item text={urlAclState?.bucketAcl || "unknown"} color={Color.PrimaryText} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={FileDetailAction({ file: props.file, refresh: props.refresh })}
    ></Detail>
  );
}

function FileDetailAction(props: { file: IObject; refresh: () => void }) {
  return (
    <ActionPanel>
      <FileCommonActions file={props.file} refresh={props.refresh} isDetail={true} />
    </ActionPanel>
  );
}

function FileCommonActions(props: { file: IObject; refresh: () => void; isDetail?: boolean }) {
  const { pop } = useNavigation();

  async function downloadFile() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading the File...",
    });
    try {
      const downloadRes = await downloadObject(props.file.name, props.file.size);
      if (downloadRes.byStream) {
        await showToast({
          style: Toast.Style.Success,
          title: "The File is a little big, downloading in the background",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "File downloaded",
        });
        await showInFinder(downloadRes.filePath);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to download the File",
      });
    }
  }

  function deleteFile() {
    confirmAlert({
      title: "Delete the File?",
      icon: Icon.Trash,
      message: `File [${props.file.name}] will be permanently removed`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await showToast({
            style: Toast.Style.Animated,
            title: "Deleting the File...",
          });
          try {
            await deleteObject(props.file.name);
            props.refresh();
            if (props.isDetail) {
              pop();
            }
            await showToast({
              style: Toast.Style.Success,
              title: "File deleted",
            });
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to delete the File",
            });
          }
        },
      },
    });
  }

  async function copyFile() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Copying the File...",
    });
    try {
      await copyObject(props.file.name);
      props.refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "File copied",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy the File",
      });
    }
  }

  return (
    <ActionPanel.Section title="File Actions">
      {!props.isDetail && (
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          target={<FileDetail file={props.file} refresh={props.refresh} />}
        />
      )}
      <Action
        title="Copy URL to Clipboard"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={async () => {
          await Clipboard.copy((await getObjUrl(props.file.name)).url);
          await showHUD("Copied to Clipboard");
        }}
      ></Action>
      <Action
        title="Open in Browser"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={async () => {
          open((await getObjUrl(props.file.name)).url);
        }}
      ></Action>
      <Action
        title="Download File"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={downloadFile}
      ></Action>
      {!props.isDetail && (
        <Action
          title="Copy File"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={copyFile}
        ></Action>
      )}
      {!props.isDetail && (
        <Action.Push
          title="Rename File"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          icon={Icon.Highlight}
          target={<RenameFile file={props.file} refresh={props.refresh}></RenameFile>}
        ></Action.Push>
      )}
      <Action
        title="Delete File"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "delete" }}
        onAction={deleteFile}
      ></Action>
    </ActionPanel.Section>
  );
}
