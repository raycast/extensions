import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
  Toast,
  Color,
  showHUD,
  Form,
  useNavigation,
  showInFinder,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  compress,
  ensureBinary,
  getFileSizeText,
  getPerviousCompressFormat,
  getStat,
  processingAlert,
  setPerviousCompressFormat,
} from "./common/utils";
import { Action$ } from "raycast-toolkit";
import { ICompressPreferences, IFileInfo } from "./common/types";
import { CompressFormat, COMPRESS_FORMAT_METADATA } from "./common/const";

export default function Command() {
  const preferences: ICompressPreferences = getPreferenceValues<ICompressPreferences>();
  const [files, updateFilesState] = useState<IFileInfo[]>([]);
  const [compressFormat, updateCompressFormatState] = useState<CompressFormat>(CompressFormat.BLANK);
  const [isLoading, updateLoadingState] = useState<boolean>(false);
  const { push } = useNavigation();

  useEffect(() => {
    ensureBinary();
    init();
  }, []);

  async function init() {
    updateLoadingState(true);
    try {
      let format = preferences.defaultCompressionFormat;
      if (format === CompressFormat.PREVIOUS) {
        const previous = await getPerviousCompressFormat();
        if (previous !== undefined) {
          format = previous;
        } else {
          format = CompressFormat["7Z"];
        }
      }
      updateCompressFormatState(format);
      preferences.defaultCompressSelected && (await getFinderItems());
    } catch (error) {
      showToast({ title: "Sorry! Something went wrong...", style: Toast.Style.Failure });
    } finally {
      updateLoadingState(false);
    }
  }

  async function getFinderItems() {
    try {
      const selectedFinderItems = await getSelectedFinderItems();
      if (!selectedFinderItems.length) {
        return;
      }
      updateFilesState(await Promise.all(selectedFinderItems.map(async (item) => await getStat(item.path))));
      // eslint-disable-next-line no-empty
    } catch (error) {}
  }

  async function compressAction(files: string[], format: CompressFormat, password?: string) {
    try {
      showToast({ title: "Compressing...", style: Toast.Style.Animated });
      const path = await compress(files, compressFormat, password);
      await setPerviousCompressFormat(compressFormat);
      await showInFinder(path);
      showHUD("🎉 Compress successfully");
      popToRoot();
    } catch (error) {
      showHUD("❌ Failed to compress...");
    }
  }

  function InputPassword(props: { files: string[]; format: CompressFormat }) {
    const [pwdError, updatePwdErrorState] = useState<string | undefined>();
    const [isLoadingInInput, updateLoadingInputState] = useState<boolean>(false);

    function dropPwdErrorIfNeeded() {
      if (pwdError && pwdError.length > 0) {
        updatePwdErrorState(undefined);
      }
    }

    async function validPwd(pwd?: string): Promise<boolean> {
      if (!pwd) {
        updatePwdErrorState("The password should't be empty");
        return false;
      }
      return true;
    }

    async function submit(password: string) {
      if (isLoadingInInput) {
        processingAlert();
        return;
      }
      if (!(await validPwd(password))) {
        return;
      }
      updateLoadingInputState(true);
      await compressAction(props.files, props.format, password);
      updateLoadingInputState(true);
    }

    return (
      <Form
        navigationTitle={"Input password to compress"}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Continue to Compress"
              onSubmit={(pwdWrapper: { password: string }) => {
                submit(pwdWrapper.password);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.PasswordField
          id="password"
          title="Password"
          autoFocus
          placeholder="Enter password"
          error={pwdError}
          onChange={dropPwdErrorIfNeeded}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} selectedItemId={files.length > 0 ? files[0].path : "-1"}>
      <List.Section title={`Format to be compressed: ${compressFormat}`}>
        {files.map((item) => (
          <List.Item
            id={item.path}
            key={item.path}
            icon={
              item.isDir
                ? { source: Icon.Folder, tintColor: Color.Blue }
                : { source: Icon.Document, tintColor: Color.PrimaryText }
            }
            title={item.path}
            accessories={[
              { text: item.isDir ? "--" : getFileSizeText(item.size || 0) },
              { text: item.isDir ? "Folder" : "File" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Start Compress"
                  icon={Icon.Minimize}
                  onAction={async () => {
                    if (isLoading) {
                      processingAlert();
                      return;
                    }
                    updateLoadingState(true);
                    await compressAction(
                      files.map((file) => file.path),
                      compressFormat,
                      ""
                    );
                    updateLoadingState(false);
                  }}
                />
                {(compressFormat === CompressFormat["7Z"] || compressFormat === CompressFormat.ZIP) && (
                  <Action
                    title="Start Compress with Password"
                    icon={{ source: Icon.Minimize, tintColor: Color.Red }}
                    onAction={async () => {
                      if (isLoading) {
                        processingAlert();
                        return;
                      }
                      push(<InputPassword files={files.map((file) => file.path)} format={compressFormat} />);
                    }}
                  />
                )}
                <ActionPanel.Submenu
                  icon={Icon.Ellipsis}
                  title="Select Compression Format..."
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                >
                  {Array.from(COMPRESS_FORMAT_METADATA.keys()).map((format) => (
                    <Action
                      key={format}
                      icon={{
                        source: format === compressFormat ? Icon.CircleProgress100 : Icon.Circle,
                        tintColor: COMPRESS_FORMAT_METADATA.get(format)?.color,
                      }}
                      title={format}
                      onAction={() => {
                        if (isLoading) {
                          processingAlert();
                          return;
                        }
                        updateCompressFormatState(format);
                        showToast({
                          title: `Compression format has been set to ${format}`,
                        });
                      }}
                    ></Action>
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title="Remove Item"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => {
                    if (isLoading) {
                      processingAlert();
                      return;
                    }
                    updateFilesState([...files.filter((file) => file.path !== item.path)]);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          id="-1"
          icon={{ source: Icon.Plus, tintColor: Color.Yellow }}
          title={"Add to Compress"}
          actions={
            <ActionPanel>
              <Action$.SelectFile
                title="Add File to Compress"
                icon={Icon.Finder}
                onSelect={async (filePath) => {
                  if (isLoading) {
                    processingAlert();
                    return;
                  }
                  if (!filePath || files.find((file) => file.path === filePath)) {
                    return;
                  }
                  updateFilesState([...files, await getStat(filePath)]);
                }}
              />
            </ActionPanel>
          }
        ></List.Item>
      </List.Section>
    </List>
  );
}
