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
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  checkPwdOnExtract,
  ensureBinary,
  extract,
  getFileSize,
  isNeedPwdOnExtract,
  isSupportExtractFormat,
  processingAlert,
} from "./common/utils";
import path from "node:path";
import { IExtractPreferences, IFileInfo } from "./common/types";
import { PRE_PWD_CHECK_THRESHOLD } from "./common/const";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const preferences: IExtractPreferences = getPreferenceValues<IExtractPreferences>();
  const [file, updateFileState] = useState<IFileInfo>();
  const [pwdChecked, updatePwdCheckedState] = useState<boolean>(false);
  const [needPwd, updateNeedPwdState] = useState<boolean>(false);
  const [pwdError, updatePwdErrorState] = useState<string | undefined>();
  const [isLoading, updateLoadingState] = useState<boolean>(true);

  useEffect(() => {
    ensureBinary();
    if (preferences.defaultExtractSelected) {
      getFinderItem();
    }
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
      const file: IFileInfo = {
        path: supports[0],
        format,
      };
      updateFileState(file);
      if (getFileSize(file.path) <= PRE_PWD_CHECK_THRESHOLD) {
        updateNeedPwdState(isNeedPwdOnExtract(file.path, file.format));
        updatePwdCheckedState(true);
      }
      updatePwdErrorState(undefined);
      // eslint-disable-next-line no-empty
    } catch {
    } finally {
      updateLoadingState(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {file && !isLoading && (
            <Action.SubmitForm
              title="Start Extract"
              icon={Icon.Maximize}
              onSubmit={async (value: { password?: string }) => {
                if (!file) return;
                if (isLoading) {
                  processingAlert();
                  return;
                }
                updateLoadingState(true);
                try {
                  if (!pwdChecked) {
                    const need = isNeedPwdOnExtract(file.path, file.format);
                    updateNeedPwdState(need);
                    updatePwdCheckedState(true);
                    if (need) {
                      return;
                    }
                  }
                  if (needPwd && !value.password) {
                    updatePwdErrorState("The password should't be empty");
                    return;
                  }
                  if (needPwd && value.password && !checkPwdOnExtract(file.path, file.format, value.password)) {
                    updatePwdErrorState("Wrong password");
                    return;
                  }
                  showToast({ title: "Extracting...", style: Toast.Style.Animated });
                  const path = await extract(file.path, file.format, value.password);
                  await showInFinder(path);
                  showHUD("🎉 Extract successfully");
                  popToRoot();
                } catch {
                  showFailureToast(new Error("Failed to Extract..."));
                } finally {
                  updateLoadingState(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Archive"
        info="File to be extracted"
        value={file ? [file.path] : []}
        allowMultipleSelection={false}
        autoFocus
        onChange={async (values) => {
          if (isLoading) {
            processingAlert();
            return;
          }
          updateLoadingState(true);
          try {
            updatePwdErrorState(undefined);
            if (!values.length) {
              updateFileState(undefined);
              updateNeedPwdState(false);
              updatePwdCheckedState(false);
              return;
            }
            const filePath = values[0];
            const format = isSupportExtractFormat(path.extname(filePath));
            if (format === null) {
              await showToast({
                title: `Format(${path.extname(filePath)}) not supported`,
                style: Toast.Style.Failure,
              });
              return;
            }
            const file: IFileInfo = {
              path: filePath,
              format,
            };
            updateFileState(file);
            if (getFileSize(file.path) <= PRE_PWD_CHECK_THRESHOLD) {
              updateNeedPwdState(isNeedPwdOnExtract(file.path, file.format));
              updatePwdCheckedState(true);
            }
          } catch {
            showToast({ title: "Sorry! Something went wrong...", style: Toast.Style.Failure });
          } finally {
            updateLoadingState(false);
          }
        }}
      />
      {needPwd && (
        <Form.PasswordField
          id="password"
          title="Password"
          placeholder="Enter password"
          error={pwdError}
          onChange={() => {
            updatePwdErrorState(undefined);
          }}
        />
      )}
    </Form>
  );
}
