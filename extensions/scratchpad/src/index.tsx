import { Form, ActionPanel, Action, Application } from "@raycast/api";
import { fileTypes } from "./constants";
import { createScratchPadFile, getDefaultHomeDir, isEmpty } from "./utils/utils";
import { useEffect, useState } from "react";
import { getValidApplicationsForScratchFile } from "./utils/utils";

export default function Command() {
  const [fileNamePrefixError, setFileNamePrefixError] = useState<string | undefined>(undefined);
  const [folderPathError, setFolderPathError] = useState<string | undefined>(undefined);
  const [applicationsList, setApplicationsList] = useState<Application[]>([]);

  useEffect(() => {
    (async () => {
      const installedApplications = await getValidApplicationsForScratchFile();
      setApplicationsList(installedApplications);
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Scratchpad File"
            onSubmit={async (values) => {
              const { folder, fileNamePrefix, fileType, applicationBundleId } = values;
              await createScratchPadFile(folder, fileNamePrefix, fileType, applicationBundleId);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="folder"
        title="Folder"
        placeholder="Enter Scratchpad Folder Path"
        defaultValue={getDefaultHomeDir()}
        error={folderPathError}
        onBlur={(event) => {
          if (isEmpty(event.target.value)) {
            setFolderPathError("Folder Path should not be empty.");
          } else {
            setFolderPathError(undefined);
          }
        }}
      />
      <Form.TextField
        id="fileNamePrefix"
        title="File Name Prefix"
        placeholder="Enter File Name Prefix"
        error={fileNamePrefixError}
        onBlur={(event) => {
          if (isEmpty(event.target.value)) {
            setFileNamePrefixError("File Name Prefix should not be empty.");
          } else {
            setFileNamePrefixError(undefined);
          }
        }}
        defaultValue="scratch_"
      />
      <Form.Dropdown id="fileType" title="FileType">
        {fileTypes.map((entry) => (
          <Form.Dropdown.Item
            value={entry.extension}
            title={entry.name + "(" + entry.extension + ")"}
            key={entry.extension}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="applicationBundleId" title="Application">
        {applicationsList.map((entry) => (
          <Form.Dropdown.Item value={entry.bundleId!} title={entry.name} key={entry.bundleId} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
