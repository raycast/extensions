import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getProjectMetadata,
  setBounceAliases,
  setExternalBounces,
  setPreviousBounceNames,
} from "@/core/metadata/project-metadata";
import {
  checkBounceAlias,
  getSharedBounceAliases,
  getSharedBounceTitles,
  resolveSharedBouncesFolder,
} from "@/core/projects/bounces";
import { strings } from "@/strings";
import { showFailure } from "@/core/ui/shared/toast";
import { formatDate } from "@/core/ui/shared/format";

// 别名一栏用逗号分隔。
const parseAliases = (text: string) =>
  text
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => alias !== "");

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
  // 别名只在设了共享 Bounces 文件夹时有用，没设时不显示这一栏。
  const showAliases = resolveSharedBouncesFolder() !== null;
  const [aliasText, setAliasText] = useState("");
  const [aliasError, setAliasError] = useState<string | undefined>();
  // 改名前的名字：默认全选，取消勾选表示删掉。
  const [previousNames, setPreviousNames] = useState<{ name: string; before: number }[]>([]);
  const [selectedPreviousNames, setSelectedPreviousNames] = useState<string[]>([]);
  // 别名和旧名字读完之前不能保存：否则会用空值覆盖已存的别名。
  const [metadataLoaded, setMetadataLoaded] = useState(!showAliases);

  useEffect(() => {
    if (!showAliases) return;
    getProjectMetadata(projectId)
      .then((metadata) => {
        setAliasText(metadata.bounceAliases.join(", "));
        setPreviousNames(metadata.previousBounceNames);
        setSelectedPreviousNames(metadata.previousBounceNames.map((previous) => previous.name));
        setMetadataLoaded(true);
      })
      .catch((error: unknown) => {
        // 读失败时表单留着、不能保存，避免覆盖已存的数据。
        void showFailure(strings.loadBounceSettingsFailed, error);
      });
  }, [projectId, showAliases]);

  function validateAliases(text: string): string | undefined {
    for (const alias of parseAliases(text)) {
      const problem = checkBounceAlias(alias, projectTitle, getSharedBounceTitles(), getSharedBounceAliases());
      if (problem && problem !== "empty") return strings.aliasTaken.replace("{project}", problem.taken);
    }
    return undefined;
  }

  async function handleSubmit() {
    if (!metadataLoaded) return;
    if (showAliases) {
      const error = validateAliases(aliasText);
      if (error) {
        setAliasError(error);
        return;
      }
      await setBounceAliases(projectId, parseAliases(aliasText));
      // 只写回还勾着的，before 保持原值。
      await setPreviousBounceNames(
        projectId,
        previousNames.filter((previous) => selectedPreviousNames.includes(previous.name)),
      );
    }
    await setExternalBounces(projectId, folders, files);
    await showToast({ style: Toast.Style.Success, title: strings.externalBounceSaved });
    onSaved(folders, files);
    pop();
  }

  return (
    <Form
      navigationTitle={`${strings.manageExternalBounce} — ${projectTitle}`}
      isLoading={!metadataLoaded}
      actions={
        metadataLoaded ? (
          <ActionPanel>
            <Action.SubmitForm title={strings.save} icon={Icon.Check} onSubmit={handleSubmit} />
          </ActionPanel>
        ) : undefined
      }
    >
      <Form.Description text={strings.externalBounceFormHint} />
      <Form.FilePicker
        id="folders"
        title={strings.externalBounceFoldersField}
        value={folders}
        onChange={setFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.FilePicker
        id="files"
        title={strings.externalBounceFilesField}
        value={files}
        onChange={setFiles}
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection
      />
      {showAliases && (
        <Form.TextField
          id="aliases"
          title={strings.bounceAliasesField}
          info={strings.bounceAliasesInfo}
          placeholder={strings.bounceAliasesPlaceholder}
          value={aliasText}
          error={aliasError}
          onChange={(value) => {
            setAliasText(value);
            if (aliasError) setAliasError(validateAliases(value));
          }}
          onBlur={() => setAliasError(validateAliases(aliasText))}
        />
      )}
      {showAliases && previousNames.length > 0 && (
        <Form.TagPicker
          id="previousNames"
          title={strings.previousNamesField}
          info={strings.previousNamesInfo}
          value={selectedPreviousNames}
          onChange={setSelectedPreviousNames}
        >
          {previousNames.map((previous) => (
            <Form.TagPicker.Item
              key={previous.name}
              value={previous.name}
              title={strings.previousNameBefore
                .replace("{name}", previous.name)
                .replace("{date}", formatDate(previous.before))}
            />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
