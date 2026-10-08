import { Form, ActionPanel, Action, Application } from "@raycast/api";
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
import { FormValidation, useForm } from "@raycast/utils";
import { ScratchPadCreationFormValues } from "./types/applicationInfo";

export default function Command() {
  const [applicationsList, setApplicationsList] = useState<Application[]>([]);
  const [hasInitDataLoaded, setHasInitDataLoaded] = useState<boolean>(false);

  const {
    handleSubmit,
    itemProps: formDetails,
    setValue,
  } = useForm<ScratchPadCreationFormValues>({
    onSubmit: async function (values: ScratchPadCreationFormValues): Promise<void | boolean> {
      const { folders, fileNamePrefix, fileType, applicationBundleId } = values;
      const folder = folders![0];

      await processSubmitAction(folder, fileNamePrefix!, fileType!, applicationBundleId!);
    },
    validation: {
      fileType: FormValidation.Required,
      fileNamePrefix: FormValidation.Required,
      applicationBundleId: FormValidation.Required,
      folders: (folders: string[] | undefined) => {
        if (!folders) {
          return "Folder path is required";
        }
        const folder = folders[0];
        if (isEmpty(folder) || !isFolderSelectionValid(folder)) {
          return "Folder path is not valid";
        }
      },
    },
    initialValues: {
      fileNamePrefix: "scratch_",
    },
  });

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

      const lastUsedFolder = await getLastUsedScratchpadFolder();
      const desktopPath = getDesktopPath();
      const lastUsedScratchpadFolder = lastUsedFolder ? [lastUsedFolder] : [desktopPath];

      setValue("applicationBundleId", defaultEditor);
      setValue("folders", lastUsedScratchpadFolder);

      setHasInitDataLoaded(true);
    })();
  }, []);

  return (
    <Form
      isLoading={!hasInitDataLoaded}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Scratchpad File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="FileType" {...formDetails.fileType}>
        {fileTypes.map((entry) => (
          <Form.Dropdown.Item
            value={entry.extension}
            title={entry.name + "(" + entry.extension + ")"}
            key={entry.extension}
          />
        ))}
      </Form.Dropdown>

      <Form.FilePicker
        title="Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        storeValue={true}
        {...formDetails.folders}
      />

      <Form.TextField title="File Name Prefix" placeholder="Enter File Name Prefix" {...formDetails.fileNamePrefix} />

      <Form.Dropdown title="Application" {...formDetails.applicationBundleId}>
        {applicationsList.map((entry) => (
          <Form.Dropdown.Item value={entry.bundleId!} title={entry.name} key={entry.bundleId} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
