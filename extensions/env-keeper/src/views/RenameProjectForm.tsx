import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { type ProjectMeta, renameProject } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { loadRegistry, saveRegistry } from "../services/storage.js";

/** 改项目的显示名。只改注册表,不动磁盘上的文件夹 */
export function RenameProjectForm({ project, onDone }: { project: ProjectMeta; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(project.name);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("rp.nameEmptyError"));
      return;
    }
    if (trimmed === project.name) {
      pop();
      return;
    }
    try {
      const { data: registry, problem } = await loadRegistry();
      if (problem) throw new Error(t("cfg.corruptedTitle"));
      await saveRegistry(renameProject(registry, project.id, trimmed));
      await showToast({ style: Toast.Style.Success, title: t("rp.renamedToast", { name: trimmed }) });
      onDone();
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={t("rp.navTitle", { name: project.name })}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("rp.submitTitle")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("rp.description", { path: project.path })} />
      <Form.TextField
        id="name"
        title={t("rp.nameTitle")}
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
      />
    </Form>
  );
}
