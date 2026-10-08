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
import { useState, useEffect, useRef } from "react";
import {
  checkPwdOnExtract,
  ensureBinary,
  extract,
  isNeedPwdOnExtract,
  isSupportExtractFormat,
  processingAlert,
} from "./common/utils";
import path from "node:path";
import { IExtractPreferences, IFileInfo } from "./common/types";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const preferences: IExtractPreferences = getPreferenceValues<IExtractPreferences>();
  const [file, updateFileState] = useState<IFileInfo>();
  const [pwdChecked, updatePwdCheckedState] = useState<boolean>(false);
  const [needPwd, updateNeedPwdState] = useState<boolean>(false);
  const [pwdError, updatePwdErrorState] = useState<string | undefined>();
  const [isLoading, updateLoadingState] = useState<boolean>(true);
  const passwordFieldRef = useRef<Form.PasswordField>(null);

  useEffect(() => {
    ensureBinary();
    if (preferences.defaultExtractSelected) {
      getFinderItem();
    } else {
      updateLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (needPwd) {
      passwordFieldRef.current?.focus();
      const timer = setTimeout(() => {
        passwordFieldRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [needPwd]);

  async function getFinderItem() {
    updateLoadingState(true);
    try {
      const selectedFinderItems = await getSelectedFinderItems();
      if (!selectedFinderItems.length) {
        return;
      }
      const supports = selectedFinderItems
        .map((item) => path.resolve(item.path))
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
      const need = await isNeedPwdOnExtract(file.path, file.format);
      updateNeedPwdState(need);
      updatePwdCheckedState(true);
      updatePwdErrorState(undefined);
      // eslint-disable-next-line no-empty
    } catch {
    } finally {
      updateLoadingState(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {file && !isLoading ? (
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
                    const need = await isNeedPwdOnExtract(file.path, file.format);
                    updateNeedPwdState(need);
                    updatePwdCheckedState(true);
                    if (need) {
                      updateLoadingState(false);
                      setTimeout(() => {
                        passwordFieldRef.current?.focus();
                      }, 50);
                      return;
                    }
                  }
                  if (needPwd && !value.password) {
                    updatePwdErrorState("The password shouldn't be empty");
                    passwordFieldRef.current?.focus();
                    updateLoadingState(false);
                    return;
                  }
                  const toast = await showToast({ title: "Extracting...", style: Toast.Style.Animated });
                  if (needPwd && value.password && !(await checkPwdOnExtract(file.path, file.format, value.password))) {
                    await toast.hide();
                    updatePwdErrorState("Wrong password");
                    passwordFieldRef.current?.focus();
                    updateLoadingState(false);
                    return;
                  }
                  const extractedPath = await extract(file.path, file.format, value.password);
                  if (preferences.revealExtracted) {
                    await showInFinder(extractedPath);
                  }
                  showHUD("🎉 Extract successfully");
                  popToRoot();
                } catch {
                  showFailureToast(new Error("Failed to Extract..."));
                } finally {
                  updateLoadingState(false);
                }
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Archive"
        info="File to be extracted"
        value={file ? [file.path] : []}
        allowMultipleSelection={false}
        autoFocus={!needPwd}
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
            const filePath = path.resolve(values[0]);
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
            const need = await isNeedPwdOnExtract(file.path, file.format);
            updateNeedPwdState(need);
            updatePwdCheckedState(true);
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
          ref={passwordFieldRef}
          title="Password"
          placeholder="Enter password"
          autoFocus
          error={pwdError}
          onChange={() => {
            updatePwdErrorState(undefined);
          }}
        />
      )}
    </Form>
  );
}
