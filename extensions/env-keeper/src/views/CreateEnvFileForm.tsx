import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ENV_TEMPLATE_FILENAMES, isValidEnvFilename } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { createEnvFile } from "../services/storage.js";

interface CreateEnvFileFormProps {
  projectPath: string;
  onCreated: (filename: string) => void;
}

// 允许用点分段:`.env.development.local` 是 Next / Vite 的标准命名
const SUFFIX_RE = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

export function CreateEnvFileForm({ projectPath, onCreated }: CreateEnvFileFormProps) {
  const { pop } = useNavigation();
  const [suffix, setSuffix] = useState("");
  const [suffixError, setSuffixError] = useState<string | undefined>();

  const filename = suffix.trim() ? `.env.${suffix.trim()}` : "";

  const handleSubmit = async () => {
    const trimmed = suffix.trim();
    if (!trimmed) {
      setSuffixError(t("cf.suffixEmptyError"));
      return;
    }
    if (!SUFFIX_RE.test(trimmed)) {
      setSuffixError(t("cf.suffixInvalidError"));
      return;
    }

    const targetFilename = `.env.${trimmed}`;
    if (ENV_TEMPLATE_FILENAMES.has(targetFilename)) {
      setSuffixError(t("cf.templateNameError", { filename: targetFilename }));
      return;
    }
    if (!isValidEnvFilename(targetFilename)) {
      setSuffixError(t("cf.suffixInvalidError"));
      return;
    }

    try {
      const result = await createEnvFile(projectPath, targetFilename);
      if (!result.created) {
        setSuffixError(
          result.notAFile
            ? t("cf.nameTakenByNonFile", { filename: targetFilename })
            : t("cf.alreadyExistsError", { filename: targetFilename }),
        );
        return;
      }
      await showToast({ style: Toast.Style.Success, title: t("cf.successToast", { filename: targetFilename }) });
      onCreated(targetFilename);
      pop();
    } catch (e) {
      await showFailureToast(t("cf.failToast"), e);
    }
  };

  return (
    <Form
      navigationTitle={t("cf.submitTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("cf.submitTitle")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("cf.description")} />
      <Form.TextField
        id="suffix"
        title={t("cf.suffixTitle")}
        placeholder={t("cf.suffixPlaceholder")}
        value={suffix}
        onChange={(val) => {
          setSuffix(val);
          setSuffixError(undefined);
        }}
        error={suffixError}
      />
      {filename && <Form.Description text={t("cf.previewFilename", { filename })} />}
    </Form>
  );
}
