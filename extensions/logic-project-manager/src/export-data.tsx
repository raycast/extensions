import { Action, ActionPanel, Form, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { useState } from "react";
import { CorruptDataError, exportData } from "@/core/data/data-transfer";
import { loadProjects } from "@/core/projects/load-projects";
import { showFailure } from "@/core/ui/shared/toast";
import { strings } from "@/strings";
import { getSettings } from "@/settings";

const settings = getSettings();

function corruptKindName(kind: CorruptDataError["kind"]): string {
  switch (kind) {
    case "metadata":
      return strings.corruptDataMetadata;
    case "categories":
      return strings.corruptDataCategories;
    case "pins":
      return strings.corruptDataPins;
    case "orders":
      return strings.corruptDataOrders;
    case "roles":
      return strings.corruptDataRoles;
    case "deleted":
      return strings.corruptDataDeleted;
  }
}

export default function ExportData() {
  const [folder, setFolder] = useState<string[]>([path.join(os.homedir(), "Documents")]);
  const [folderError, setFolderError] = useState<string | undefined>();

  function validateFolder(value: string[]): string | undefined {
    const target = value[0];
    if (!target) return strings.exportFolderRequired;
    try {
      if (!fs.statSync(target).isDirectory()) return strings.exportFolderNotDirectory;
    } catch {
      return strings.exportFolderMissing;
    }
    return undefined;
  }

  async function handleSubmit() {
    const error = validateFolder(folder);
    if (error) {
      setFolderError(error);
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: strings.exportingData });
    try {
      const projects = settings.projectsFolder ? loadProjects(settings.projectsFolder) : [];
      const file = await exportData(folder[0], projects);
      toast.style = Toast.Style.Success;
      toast.title = strings.dataExported;
      toast.message = path.basename(file);
      toast.primaryAction = {
        title: strings.showInFinder,
        onAction: () => {
          void showInFinder(file);
        },
      };
    } catch (error) {
      if (error instanceof CorruptDataError) {
        await showFailure(strings.exportFailed, error, { message: corruptKindMessage(error) });
        return;
      }
      await showFailure(strings.exportFailed, error);
    }
  }

  function corruptKindMessage(error: CorruptDataError): string {
    return strings.corruptDataKind.replace("{kind}", corruptKindName(error.kind));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.exportData} icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title={strings.saveTo}
        value={folder}
        error={folderError}
        onChange={(value) => {
          setFolder(value);
          if (folderError) setFolderError(validateFolder(value));
        }}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        storeValue
        defaultValue={[path.join(os.homedir(), "Documents")]}
      />
      <Form.Description text={strings.exportDataHint} />
    </Form>
  );
}
