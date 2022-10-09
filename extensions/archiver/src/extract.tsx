import {
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
  Toast,
  showHUD,
  showInFinder,
  popToRoot,
  Form,
  useNavigation,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  checkPwdOnExtract,
  ensureBinary,
  extract,
  getFileSizeText,
  getStat,
  isNeedPwdOnExtract,
  isSupportExtractFormat,
  processingAlert,
} from "./common/utils";
import { Action$ } from "raycast-toolkit";
import path from "node:path";
import { IExtractPreferences, IFileInfo } from "./common/types";
import { ExtractFormat, EXTRACT_FORMAT_METADATA } from "./common/const";

export default function Command() {
  const preferences: IExtractPreferences = getPreferenceValues<IExtractPreferences>();
  const [file, updateFileState] = useState<IFileInfo>();
  const [isLoading, updateLoadingState] = useState<boolean>(true);
  const { push } = useNavigation();

  useEffect(() => {
    ensureBinary();
    preferences.defaultExtractSelected && getFinderItem();
  }, []);

  async function getFinderItem() {
    updateLoadingState(true);
    try {
      const selectedFinderItems = await getSelectedFinderItems();
      if (!selectedFinderItems.length) {
        return;
      }
      const supports = selectedFinderItems
        .map((item) => item.path)
        .filter((item) => isSupportExtractFormat(path.extname(item)) !== null);

      if (!supports.length) {
        return;
      }
      const format = isSupportExtractFormat(path.extname(supports[0]));
      const file = await getStat(supports[0]);
      file.format = format;
      updateFileState(file);
      await showToast({
        title: "Get selected Finder item successfully",
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showToast({
        title: "Get selected Finder item failed",
        style: Toast.Style.Failure,
      });
    } finally {
      updateLoadingState(false);
    }
  }

  async function extractAction(file: string, format: ExtractFormat, password?: string): Promise<string | undefined> {
    try {
      if (!password && isNeedPwdOnExtract(file, format)) {
        push(<InputPassword file={file} format={format} />);
        return;
      }
      showToast({ title: "Extracting...", style: Toast.Style.Animated });
      const path = await extract(file, format, password);
      await showInFinder(path);
      showHUD("Extract successfully 🎉");
      popToRoot();
    } catch (error) {
      showHUD("Failed to extract...");
    }
  }

  function InputPassword(props: { file: string; format: ExtractFormat }) {
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
      if (!checkPwdOnExtract(props.file, props.format, pwd)) {
        updatePwdErrorState("Wrong password");
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
      await extractAction(props.file, props.format, password);
      updateLoadingInputState(false);
    }

    return (
      <Form
        navigationTitle={`Input password for "${path.basename(props.file)}"`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Continue to Extract"
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
  if (file) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# ${path.basename(file.path)}`}
        navigationTitle="Extract Files"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Type">
              <Detail.Metadata.TagList.Item
                text={file.format}
                color={EXTRACT_FORMAT_METADATA.get(file.format)?.color}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Size" text={getFileSizeText(file.size || 0)} />
            <Detail.Metadata.Label title="Path" text={path.dirname(file.path)} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Start Extract"
              icon={Icon.Maximize}
              onAction={async () => {
                if (isLoading) {
                  processingAlert();
                  return;
                }
                updateLoadingState(true);
                await extractAction(file.path, file.format);
                updateLoadingState(false);
              }}
            />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <Detail
        isLoading={isLoading}
        markdown={isLoading ? "" : "# ➕Add file to extract"}
        navigationTitle="Extract Files"
        actions={
          <ActionPanel>
            <Action$.SelectFile
              title="Add File to Extract"
              icon={Icon.Finder}
              onSelect={async (filePath) => {
                if (!filePath) return;
                const format = isSupportExtractFormat(path.extname(filePath));
                if (format === null) {
                  await showToast({
                    title: `Format(${path.extname(filePath)}) not supported`,
                    style: Toast.Style.Failure,
                  });
                  return;
                }
                const file = await getStat(filePath);
                file.format = format;
                updateFileState(file);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
}
