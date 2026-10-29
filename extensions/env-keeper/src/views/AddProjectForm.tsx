import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { basename } from "node:path";
import { useState } from "react";
import { addProject, type ProjectMeta } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { loadRegistry, saveRegistry } from "../services/storage.js";

interface AddProjectFormProps {
  onProjectAdded: (project: ProjectMeta) => void;
}

export function AddProjectForm({ onProjectAdded }: AddProjectFormProps) {
  const { pop } = useNavigation();
  const [files, setFiles] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [pathError, setPathError] = useState<string | undefined>();

  const handleFilesChange = (newFiles: string[]) => {
    setFiles(newFiles);
    setPathError(undefined);
    const chosen = newFiles[0];
    if (chosen && !name) {
      setName(basename(chosen));
    }
  };

  const handleSubmit = async () => {
    const cleanPath = files[0];
    if (!cleanPath) {
      setPathError(t("addProject.pathError"));
      return;
    }

    try {
      const { data: registry } = await loadRegistry();
      const finalName = name.trim() || basename(cleanPath);
      const { registry: updatedRegistry, project } = addProject(registry, {
        name: finalName,
        path: cleanPath,
      });

      await saveRegistry(updatedRegistry);
      await showToast({ style: Toast.Style.Success, title: t("addProject.successToast", { name: finalName }) });
      onProjectAdded(project);
      pop();
    } catch (e) {
      await showFailureToast(t("addProject.failToast"), e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("addProject.submitTitle")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("addProject.description")} />
      <Form.FilePicker
        id="path"
        title={t("addProject.pathTitle")}
        value={files}
        onChange={handleFilesChange}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        error={pathError}
      />
      <Form.TextField
        id="name"
        title={t("addProject.nameTitle")}
        placeholder={t("addProject.namePlaceholder")}
        value={name}
        onChange={setName}
      />
    </Form>
  );
}
