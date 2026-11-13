import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ENV_KEY_RE, type EnvQuote, isEncryptedValue, isSecretKey } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";

export interface VariableFormData {
  key: string;
  value: string;
  quote: EnvQuote | null;
  disabled: boolean;
  isSecret: boolean;
  /** 行内注释正文(不含 `#`);空串表示不要注释 */
  comment: string;
}

interface EditVariableFormProps {
  initialData?: {
    key: string;
    value: string;
    quote: EnvQuote | null;
    disabled: boolean;
    comment?: string;
  };
  customSecrets?: string[];
  onSave: (data: VariableFormData) => Promise<void>;
}

export function EditVariableForm({ initialData, customSecrets, onSave }: EditVariableFormProps) {
  const { pop } = useNavigation();
  const isEditing = Boolean(initialData);

  const [key, setKey] = useState(initialData?.key ?? "");
  const [value, setValue] = useState(initialData?.value ?? "");
  const [quoteType, setQuoteType] = useState<string>(
    initialData?.quote === '"'
      ? "double"
      : initialData?.quote === "'"
        ? "single"
        : initialData?.quote === "`"
          ? "backtick"
          : "none",
  );
  const [disabled, setDisabled] = useState(initialData?.disabled ?? false);
  const [comment, setComment] = useState(initialData?.comment ?? "");

  const isDefaultSecret = isSecretKey(key, customSecrets, value);
  const [customSecretChecked, setCustomSecretChecked] = useState(isDefaultSecret);

  const [keyError, setKeyError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();

  // dotenvx 感知:原本就是 encrypted: 前缀的值,直接改明文会破坏加密数据,需要用户显式确认才放行
  const wasEncrypted = Boolean(initialData && isEncryptedValue(initialData.value));
  const [confirmOverrideEncrypted, setConfirmOverrideEncrypted] = useState(false);

  const handleSubmit = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setKeyError(t("ev.keyEmptyError"));
      return;
    }

    // 跟解析器用同一条规则(dotenv 的 [\w.-]+),否则文件里能读出来的变量在这里改一下名就存不回去
    if (!ENV_KEY_RE.test(trimmedKey)) {
      setKeyError(t("ev.keyInvalidError"));
      return;
    }

    if (wasEncrypted && value !== initialData?.value && !confirmOverrideEncrypted) {
      setValueError(t("ev.encryptedBlockedError"));
      return;
    }

    const quote: EnvQuote | null =
      quoteType === "double" ? '"' : quoteType === "single" ? "'" : quoteType === "backtick" ? "`" : null;

    try {
      await onSave({
        key: trimmedKey,
        value,
        quote,
        disabled,
        isSecret: customSecretChecked,
        comment: comment.trim(),
      });
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? t("ev.submitEdit") : t("ev.submitCreate")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {wasEncrypted && <Form.Description text={t("ev.encryptedWarning")} />}
      <Form.TextField
        id="key"
        title={t("ev.keyTitle")}
        placeholder={t("ev.keyPlaceholder")}
        value={key}
        onChange={(val) => {
          setKey(val);
          setKeyError(undefined);
          setCustomSecretChecked(isSecretKey(val, customSecrets, value));
        }}
        error={keyError}
      />
      <Form.TextArea
        id="value"
        title={t("ev.valueTitle")}
        placeholder={t("ev.valuePlaceholder")}
        value={value}
        onChange={(val) => {
          setValue(val);
          setValueError(undefined);
        }}
        error={valueError}
      />
      {wasEncrypted && (
        <Form.Checkbox
          id="confirmOverrideEncrypted"
          label={t("ev.encryptedOverrideLabel")}
          value={confirmOverrideEncrypted}
          onChange={setConfirmOverrideEncrypted}
        />
      )}
      <Form.TextField
        id="comment"
        title={t("ev.commentTitle")}
        placeholder={t("ev.commentPlaceholder")}
        info={t("ev.commentInfo")}
        value={comment}
        onChange={setComment}
      />
      <Form.Dropdown
        id="quote"
        title={t("ev.quoteTitle")}
        value={quoteType}
        onChange={setQuoteType}
        placeholder={t("common.searchPlaceholder")}
      >
        <Form.Dropdown.Item value="none" title={t("ev.quoteNone")} />
        <Form.Dropdown.Item value="double" title={t("ev.quoteDouble")} />
        <Form.Dropdown.Item value="single" title={t("ev.quoteSingle")} />
        <Form.Dropdown.Item value="backtick" title={t("ev.quoteBacktick")} />
      </Form.Dropdown>
      <Form.Checkbox id="disabled" label={t("ev.disabledLabel")} value={disabled} onChange={setDisabled} />
      <Form.Checkbox
        id="isSecret"
        label={t("ev.secretLabel")}
        value={customSecretChecked}
        onChange={setCustomSecretChecked}
      />
    </Form>
  );
}
