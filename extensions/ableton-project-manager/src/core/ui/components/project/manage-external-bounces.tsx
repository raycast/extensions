import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { setExternalBounces } from "@/core/metadata/project-metadata";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";

const settings = getSettings();
const t = getTranslations(settings.language);

export function ManageExternalBounces({
  projectId,
  projectTitle,
  externalFolders,
  externalFiles,
  onSaved,
}: {
  projectId: string;
  projectTitle: string;
  externalFolders: string[];
  externalFiles: string[];
  onSaved: (externalFolders: string[], externalFiles: string[]) => void;
}) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<string[]>(externalFolders);
  const [files, setFiles] = useState<string[]>(externalFiles);

  async function handleSubmit() {
    await setExternalBounces(projectId, folders, files);
    await showToast({ style: Toast.Style.Success, title: t.externalBounceSaved });
    onSaved(folders, files);
    pop();
  }

  return (
    <Form
      navigationTitle={`${t.manageExternalBounce} — ${projectTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t.externalBounceFormHint} />
      <Form.FilePicker
        id="folders"
        title={t.externalBounceFoldersField}
        value={folders}
        onChange={setFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.FilePicker
        id="files"
        title={t.externalBounceFilesField}
        value={files}
        onChange={setFiles}
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection
      />
    </Form>
  );
}
