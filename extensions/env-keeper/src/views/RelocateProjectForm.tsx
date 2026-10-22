import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { relocateProject, type ProjectMeta } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { loadRegistry, saveRegistry } from "../services/storage.js";

/**
 * 项目目录被改名或搬走之后,重新指过去。
 *
 * 之所以能"重新指"而不是"删了重加",是因为项目 id 已经和路径解耦了:
 * 改 path 不会动 id,绑在 id 上的敏感标记、已关闭的提示全部保留。
 */
export function RelocateProjectForm({ project, onDone }: { project: ProjectMeta; onDone: () => void }) {
  const { pop } = useNavigation();
  const [paths, setPaths] = useState<string[]>([]);
  const [pathError, setPathError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const newPath = paths[0];
    if (!newPath) {
      setPathError(t("mv.relocatePathError"));
      return;
    }
    try {
      const { data: registry } = await loadRegistry();
      await saveRegistry(relocateProject(registry, project.id, newPath));
      await showToast({ style: Toast.Style.Success, title: t("mv.relocatedToast") });
      onDone();
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={t("mv.relocateNavTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mv.relocateSubmit")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("mv.relocateDescription", { name: project.name })} />
      <Form.Description title={t("mv.relocateOldPath")} text={project.path} />
      <Form.FilePicker
        id="path"
        title={t("mv.relocatePathTitle")}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={paths}
        onChange={(v) => {
          setPaths(v);
          setPathError(undefined);
        }}
        error={pathError}
      />
    </Form>
  );
}
