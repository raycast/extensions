import {
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
  Toast,
  showHUD,
  Form,
  showInFinder,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { compress, ensureBinary, processingAlert } from "./common/utils";
import { ICompressPreferences } from "./common/types";
import { CompressFormat, COMPRESS_FORMAT_METADATA } from "./common/const";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const preferences: ICompressPreferences = getPreferenceValues<ICompressPreferences>();
  const [files, updateFilesState] = useState<string[]>([]);
  const [pwdOptional, updatePwdOptionalState] = useState<boolean>(false);
  const [isLoading, updateLoadingState] = useState<boolean>(false);

  useEffect(() => {
    ensureBinary();
    init();
  }, []);

  async function init() {
    updateLoadingState(true);
    if (preferences.defaultCompressSelected) {
      await getFinderItems();
    }
    updateLoadingState(false);
  }

  async function getFinderItems() {
    try {
      const selectedFinderItems = await getSelectedFinderItems();
      if (!selectedFinderItems.length) {
        return;
      }
      updateFilesState(selectedFinderItems.map((item) => item.path));
      // eslint-disable-next-line no-empty
    } catch {}
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {files.length && !isLoading && (
            <Action.SubmitForm
              title="Start Compress"
              icon={Icon.Minimize}
              onSubmit={async (value: { password?: string; format: CompressFormat }) => {
                if (!files.length) return;
                if (isLoading) {
                  processingAlert();
                  return;
                }
                updateLoadingState(true);
                try {
                  showToast({ title: "Compressing...", style: Toast.Style.Animated });
                  const path = await compress(files, value.format, value.password);
                  await showInFinder(path);
                  showHUD("🎉 Compress successfully");
                  popToRoot();
                } catch (error) {
                  showFailureToast(error, { title: "Failed to compress" });
                } finally {
                  updateLoadingState(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="format"
        title="Format"
        defaultValue={preferences.defaultCompressionFormat}
        storeValue={preferences.defaultCompressionFormat === CompressFormat.PREVIOUS}
        onChange={(format) => {
          updatePwdOptionalState(format === CompressFormat["7Z"] || format === CompressFormat.ZIP);
        }}
      >
        {Array.from(COMPRESS_FORMAT_METADATA.keys()).map((format) => (
          <Form.Dropdown.Item
            key={format}
            value={format}
            title={format}
            icon={{
              source: Icon.CircleProgress100,
              tintColor: COMPRESS_FORMAT_METADATA.get(format)?.color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="files"
        title="Files"
        info="Files to be compressed"
        value={files}
        autoFocus
        canChooseDirectories
        onChange={(values) => {
          if (isLoading) {
            processingAlert();
            return;
          }
          updateFilesState(values);
        }}
      />
      {pwdOptional && <Form.PasswordField id="password" title="Password" placeholder="Enter password(Optional)" />}
    </Form>
  );
}
