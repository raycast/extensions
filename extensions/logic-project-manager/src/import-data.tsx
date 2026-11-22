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

/** 只列出计数大于 0 的类别。 */
function changeSummary(changes: ImportChanges): string {
  const parts: string[] = [];
  if (changes.projects > 0) parts.push(strings.importChangeProjects.replace("{count}", String(changes.projects)));
  if (changes.options > 0) parts.push(strings.importChangeOptions.replace("{count}", String(changes.options)));
  if (changes.collections > 0) {
    parts.push(strings.importChangeCollections.replace("{count}", String(changes.collections)));
  }
  if (changes.pins > 0) parts.push(strings.importChangePins);
  return parts.join(", ");
}

function resultSummary(plan: ImportPlan): string {
  const parts: string[] = [];
  if (plan.result.restored > 0)
    parts.push(strings.importResultRestored.replace("{count}", String(plan.result.restored)));
  if (plan.result.kept > 0) parts.push(strings.importResultKept.replace("{count}", String(plan.result.kept)));
  if (plan.result.rematched > 0) {
    parts.push(strings.importResultRematched.replace("{count}", String(plan.result.rematched)));
  }
  if (plan.result.unmatched > 0) {
    parts.push(strings.importResultUnmatched.replace("{count}", String(plan.result.unmatched)));
  }
  if (plan.result.droppedTracks > 0) {
    parts.push(strings.importResultDropped.replace("{count}", String(plan.result.droppedTracks)));
  }
  return parts.join(", ");
}

export default function ImportData() {
  const [file, setFile] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | undefined>();

  function validateFile(value: string[]): string | undefined {
    return value[0] ? undefined : strings.importFileRequired;
  }

  async function handleSubmit() {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    const target = file[0];
    const toast = await showToast({ style: Toast.Style.Animated, title: strings.importingData });
    try {
      const raw = fs.readFileSync(target, "utf8");
      const parsed = parseDataFile(raw, environment.extensionName);
      await assertImportReady(parsed);

      const projects = settings.projectsFolder ? loadProjects(settings.projectsFolder) : null;
      const current = await readCurrentData();
      const plan = planImport(parsed, current, projects);

      if (plan.unchanged) {
        toast.style = Toast.Style.Success;
        toast.title = strings.importNothingToChange;
        return;
      }

      let backupPath: string | null = null;
      if (plan.changeCount > 0) {
        const backupName = backupFileName(new Date());
        const confirmed = await confirmAlert({
          title: strings.importConfirmTitle,
          message: `${strings.importConfirmBody.replace("{changes}", changeSummary(plan.changes))} ${strings.importConfirmBackup.replace("{file}", backupName)}`,
          primaryAction: { title: strings.replaceData, style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) {
          await toast.hide();
          return;
        }
        backupPath = await writeBackup(path.dirname(target), projects ?? []);
      }

      await applyPlan(plan, current);

      toast.style = Toast.Style.Success;
      toast.title = strings.dataImported;
      toast.message = resultSummary(plan);
      if (backupPath) {
        const backup = backupPath;
        toast.message = `${toast.message} ${strings.importBackupSaved.replace("{file}", path.basename(backup))}`;
        toast.primaryAction = {
          title: strings.showInFinder,
          onAction: () => {
            void showInFinder(backup);
          },
        };
      }
    } catch (error) {
      if (error instanceof CorruptDataError) {
        await showFailure(strings.importFailed, error, {
          message: strings.corruptDataKind.replace("{kind}", corruptKindName(error.kind)),
        });
        return;
      }
      if (error instanceof DataFileError) {
        await showFailure(strings.importFailed, new Error(importErrorMessage(error)));
        return;
      }
      await showFailure(strings.importFailed, error);
    }
  }

  function importErrorMessage(error: DataFileError): string {
    switch (error.reason) {
      case "parse":
      case "format":
        return strings.importBadFormat;
      case "version":
        return strings.importBadVersion;
      case "extension":
        return strings.importOtherExtension.replace("{extension}", error.message);
      case "structure":
        // 校验失败时写明是哪一块数据、第一个出错的位置和原因。
        return strings.importBadStructureAt.replace("{detail}", error.message);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.importData} icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title={strings.importFile}
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
