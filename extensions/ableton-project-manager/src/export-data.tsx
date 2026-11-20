import { Action, ActionPanel, Form, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { useState } from "react";
import { CorruptDataError, exportData } from "@/core/data/data-transfer";
import { loadProjects } from "@/core/projects/load-projects";
import { showFailure } from "@/core/ui/toast";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";

const settings = getSettings();

function corruptKindName(kind: CorruptDataError["kind"]): string {
  switch (kind) {
    case "metadata":
      return t.corruptDataMetadata;
    case "categories":
      return t.corruptDataCategories;
    case "pins":
      return t.corruptDataPins;
    case "orders":
      return t.corruptDataOrders;
    case "roles":
      return t.corruptDataRoles;
    case "deleted":
      return t.corruptDataDeleted;
  }
}
const t = getTranslations(settings.language);

export default function ExportData() {
  const [folder, setFolder] = useState<string[]>([path.join(os.homedir(), "Documents")]);
  const [folderError, setFolderError] = useState<string | undefined>();

  function validateFolder(value: string[]): string | undefined {
    const target = value[0];
    if (!target) return t.exportFolderRequired;
    try {
      if (!fs.statSync(target).isDirectory()) return t.exportFolderNotDirectory;
    } catch {
      return t.exportFolderMissing;
    }
    return undefined;
  }

  async function handleSubmit() {
    const error = validateFolder(folder);
    if (error) {
      setFolderError(error);
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: t.exportingData });
    try {
      const projects = settings.projectsFolder ? loadProjects(settings.projectsFolder) : [];
      const file = await exportData(folder[0], projects);
      toast.style = Toast.Style.Success;
      toast.title = t.dataExported;
      toast.message = path.basename(file);
      toast.primaryAction = {
        title: t.showInFinder,
        onAction: () => {
          void showInFinder(file);
        },
      };
    } catch (error) {
      if (error instanceof CorruptDataError) {
        await showFailure(t.exportFailed, error, { message: corruptKindMessage(error) });
        return;
      }
      await showFailure(t.exportFailed, error);
    }
  }

  function corruptKindMessage(error: CorruptDataError): string {
    return t.corruptDataKind.replace("{kind}", corruptKindName(error.kind));
  }

  return (
    <Form
      navigationTitle={t.exportData}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.exportData} icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title={t.saveTo}
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
      <Form.Description text={t.exportDataHint} />
    </Form>
  );
}
