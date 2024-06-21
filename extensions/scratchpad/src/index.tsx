import { Form, ActionPanel, Action, Application, Detail } from "@raycast/api";
import { fileTypes } from "./constants";
import {
  isEmpty,
  getLastUsedEditorId,
  getLastUsedScratchpadFolder,
  getDesktopPath,
  isFolderSelectionValid,
  processSubmitAction,
} from "./utils/utils";
import { useEffect, useState } from "react";

import { getValidApplicationsForScratchFile } from "./utils/utils";

export default function Command() {
  const [fileNamePrefixError, setFileNamePrefixError] = useState<string | undefined>(undefined);
  const [applicationsList, setApplicationsList] = useState<Application[]>([]);
  const [defaultEditorBundleId, setDefaultEditorBundleId] = useState<string | undefined>(undefined);
  const [lastUsedScratchpadFolder, setLastUsedScratchpadFolder] = useState<string[] | undefined>(undefined);
  const [hasInitDataLoaded, setHasInitDataLoaded] = useState<boolean>(false);
  const [folderSelectionError, setFolderSelectionError] = useState<string | undefined>(undefined);
  const [defaultAppPickerError, setDefaultAppPickerError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      // stores a list of default application
      const installedApplications = await getValidApplicationsForScratchFile();
      setApplicationsList(installedApplications);

      const lastUsedEditorBundleId = await getLastUsedEditorId();

      const firstApplication = installedApplications[0].bundleId;

      const defaultEditor =
        lastUsedEditorBundleId && installedApplications.find((app) => app.bundleId === lastUsedEditorBundleId)
          ? lastUsedEditorBundleId
          : firstApplication;
      setDefaultEditorBundleId(defaultEditor);
      if (!defaultEditor) {
        setDefaultAppPickerError("No default application found. Please Install an editor and try again.");
      }

      const lastUsedFolder = await getLastUsedScratchpadFolder();
      const desktopPath = getDesktopPath();
      const lastUsedScratchpadFolder = lastUsedFolder ? [lastUsedFolder] : [desktopPath];
      setLastUsedScratchpadFolder(lastUsedScratchpadFolder);
      setHasInitDataLoaded(true);
    })();
  }, []);

  if (!hasInitDataLoaded) {
    return <Detail markdown="Please wait while we load the application." />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Scratchpad File"
            onSubmit={async (values) => {
              const { folders, fileNamePrefix, fileType, applicationBundleId } = values;
              const folder = folders[0];
              const folderSelectionError =
                isEmpty(folder) || !isFolderSelectionValid(folder) ? "folder path is not valid" : undefined;
              setFolderSelectionError(folderSelectionError);
              if (folderSelectionError) {
                // abort if there is some folder selection related error
                return;
              }
              await processSubmitAction(folder, fileNamePrefix, fileType, applicationBundleId);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="fileType" title="FileType">
        {fileTypes.map((entry) => (
          <Form.Dropdown.Item
            value={entry.extension}
            title={entry.name + "(" + entry.extension + ")"}
            key={entry.extension}
          />
        ))}
      </Form.Dropdown>

      <Form.FilePicker
        id="folders"
        title="Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        defaultValue={lastUsedScratchpadFolder}
        storeValue={true}
        error={folderSelectionError}
        onBlur={(event) => {
          const folderSelectionError =
            isEmpty(event.target.value) || !isFolderSelectionValid(event.target.value![0])
              ? "folder path is not valid"
              : undefined;
          setFolderSelectionError(folderSelectionError);
        }}
      />

      <Form.TextField
        id="fileNamePrefix"
        title="File Name Prefix"
        placeholder="Enter File Name Prefix"
        error={fileNamePrefixError}
        onBlur={(event) => {
          const namePrefixErr = isEmpty(event.target.value) ? "File Name Prefix should not be empty." : undefined;
          setFileNamePrefixError(namePrefixErr);
        }}
        defaultValue="scratch_"
      />

      <Form.Dropdown
        id="applicationBundleId"
        title="Application"
        defaultValue={defaultEditorBundleId}
        error={defaultAppPickerError}
      >
        {applicationsList.map((entry) => (
          <Form.Dropdown.Item value={entry.bundleId!} title={entry.name} key={entry.bundleId} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
