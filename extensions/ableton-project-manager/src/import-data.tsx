import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useState } from "react";
import {
  applyPlan,
  assertImportReady,
  backupFileName,
  CorruptDataError,
  DataFileError,
  parseDataFile,
  planImport,
  readCurrentData,
  writeBackup,
  type ImportChanges,
  type ImportPlan,
} from "@/core/data/data-transfer";
import { loadProjects } from "@/core/projects/load-projects";
import { showFailure } from "@/core/ui/toast";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";

const settings = getSettings();
const t = getTranslations(settings.language);

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

/** 只列出计数大于 0 的类别。 */
function changeSummary(changes: ImportChanges): string {
  const parts: string[] = [];
  if (changes.projects > 0) parts.push(t.importChangeProjects.replace("{count}", String(changes.projects)));
  if (changes.options > 0) parts.push(t.importChangeOptions.replace("{count}", String(changes.options)));
  if (changes.collections > 0) {
    parts.push(t.importChangeCollections.replace("{count}", String(changes.collections)));
  }
  if (changes.pins > 0) parts.push(t.importChangePins);
  return parts.join(", ");
}

function resultSummary(plan: ImportPlan): string {
  const parts: string[] = [];
  if (plan.result.restored > 0) parts.push(t.importResultRestored.replace("{count}", String(plan.result.restored)));
  if (plan.result.kept > 0) parts.push(t.importResultKept.replace("{count}", String(plan.result.kept)));
  if (plan.result.rematched > 0) {
    parts.push(t.importResultRematched.replace("{count}", String(plan.result.rematched)));
  }
  if (plan.result.unmatched > 0) {
    parts.push(t.importResultUnmatched.replace("{count}", String(plan.result.unmatched)));
  }
  if (plan.result.droppedTracks > 0) {
    parts.push(t.importResultDropped.replace("{count}", String(plan.result.droppedTracks)));
  }
  return parts.join(", ");
}

export default function ImportData() {
  const [file, setFile] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | undefined>();

  function validateFile(value: string[]): string | undefined {
    return value[0] ? undefined : t.importFileRequired;
  }

  async function handleSubmit() {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    const target = file[0];
    const toast = await showToast({ style: Toast.Style.Animated, title: t.importingData });
    try {
      const raw = fs.readFileSync(target, "utf8");
      const parsed = parseDataFile(raw, environment.extensionName);
      await assertImportReady(parsed);

      const projects = settings.projectsFolder ? loadProjects(settings.projectsFolder) : null;
      const current = await readCurrentData();
      const plan = planImport(parsed, current, projects);

      if (plan.unchanged) {
        toast.style = Toast.Style.Success;
        toast.title = t.importNothingToChange;
        return;
      }

      let backupPath: string | null = null;
      if (plan.changeCount > 0) {
        const backupName = backupFileName(new Date());
        const confirmed = await confirmAlert({
          title: t.importConfirmTitle,
          message: `${t.importConfirmBody.replace("{changes}", changeSummary(plan.changes))} ${t.importConfirmBackup.replace("{file}", backupName)}`,
          primaryAction: { title: t.replaceData, style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) {
          await toast.hide();
          return;
        }
        backupPath = await writeBackup(path.dirname(target), projects ?? []);
      }

      await applyPlan(plan, current);

      toast.style = Toast.Style.Success;
      toast.title = t.dataImported;
      toast.message = resultSummary(plan);
      if (backupPath) {
        const backup = backupPath;
        toast.message = `${toast.message} ${t.importBackupSaved.replace("{file}", path.basename(backup))}`;
        toast.primaryAction = {
          title: t.showInFinder,
          onAction: () => {
            void showInFinder(backup);
          },
        };
      }
    } catch (error) {
      if (error instanceof CorruptDataError) {
        await showFailure(t.importFailed, error, {
          message: t.corruptDataKind.replace("{kind}", corruptKindName(error.kind)),
        });
        return;
      }
      if (error instanceof DataFileError) {
        await showFailure(t.importFailed, new Error(importErrorMessage(error)));
        return;
      }
      await showFailure(t.importFailed, error);
    }
  }

  function importErrorMessage(error: DataFileError): string {
    switch (error.reason) {
      case "parse":
      case "format":
        return t.importBadFormat;
      case "version":
        return t.importBadVersion;
      case "extension":
        return t.importOtherExtension.replace("{extension}", error.message);
      case "structure":
        // 校验失败时写明是哪一块数据、第一个出错的位置和原因。
        return t.importBadStructureAt.replace("{detail}", error.message);
    }
  }

  return (
    <Form
      navigationTitle={t.importData}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.importData} icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title={t.importFile}
        value={file}
        error={fileError}
        onChange={(value) => {
          setFile(value);
          if (fileError) setFileError(validateFile(value));
        }}
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection={false}
      />
    </Form>
  );
}
