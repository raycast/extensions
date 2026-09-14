import { Action, ActionPanel, Alert, confirmAlert, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import {
  lintShellSnippet,
  matchesDeclaredType,
  type ShellLintWarning,
  type ShellSnippet,
  type ShellSnippetType,
} from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { isKnownCommand, validateShellSyntax, type ValidatableShell } from "../services/shellValidator.js";
import { useGroupFields } from "./GroupFields.js";

interface EditShellSnippetFormProps {
  initialData?: ShellSnippet;
  /** 探测到的用户真实登录 shell,用来决定拿 zsh -n 还是 bash -n 校验;识别不出来(如 fish)传 undefined,直接跳过语法校验 */
  shellKind: ValidatableShell | undefined;
  /** 已经用过的分组名,列在下拉框里供选 */
  existingGroups: string[];
  onSave: (data: Omit<ShellSnippet, "id">) => Promise<void>;
}

/**
 * 每种类型的起手式。
 *
 * 「类型」这个字段的本意就是**新建预设**——当初决定"alias 不做独立模块,
 * 作为片段的一种类型"(设计决议 §三),靠的就是选类型时给出对应的写法,
 * 用一个字段替代一整个模块。之前只实现了"事后挑毛病"的类型校验,
 * 却漏了"事前给范例"这一半,所以选 alias 也只看到 export 的示例。
 */
const SNIPPET_TEMPLATES: Record<ShellSnippetType, string> = {
  export: 'export MY_VAR="value"',
  alias: 'alias ll="ls -la"',
  snippet: ["# 任意 shell 代码,会原样写进 shell.sh", "mkcd() {", '  mkdir -p "$1" && cd "$1"', "}"].join("\n"),
};

function describeWarning(w: ShellLintWarning): string {
  return w.suggestion
    ? t("es.lintMisspelled", { line: w.line, word: w.word, suggestion: w.suggestion })
    : t("es.lintUnknownPrefix", { line: w.line, word: w.word });
}

export function EditShellSnippetForm({ initialData, shellKind, existingGroups, onSave }: EditShellSnippetFormProps) {
  const { pop } = useNavigation();

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<ShellSnippetType>(initialData?.type ?? "export");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [containsSecret, setContainsSecret] = useState(initialData?.containsSecret ?? false);
  const { group, fields: groupFields } = useGroupFields(initialData?.group, existingGroups);
  const [nameError, setNameError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();

  const handleTypeChange = (newType: string) => {
    const nextType = newType as ShellSnippetType;
    setType(nextType);
    // 内容为空、或者还停在某个类型的示例上时,换成新类型的示例。
    // 判断"是不是还停在示例上"才能让来回切类型都拿到对的起手式,
    // 同时绝不会覆盖用户真正写过的东西
    const isUntouched = content.trim() === "" || Object.values(SNIPPET_TEMPLATES).includes(content);
    if (isUntouched) setContent(SNIPPET_TEMPLATES[nextType]);
  };

  // 内容跟声明的类型对不上时,给一个不阻止保存的温和提示(export/alias 才检查,snippet 类型不限制)
  const typeMismatch = content.trim() !== "" && !matchesDeclaredType(type, content);
  const typeMismatchHint = type === "export" ? t("es.exportMismatchHint") : t("es.aliasMismatchHint");

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t("es.nameEmptyError"));
      return;
    }
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setContentError(t("es.contentEmptyError"));
      return;
    }

    // 拼写检查:`exprot PASSWORD=xxx` 语法完全合法,shell 自己永远报不出来,
    // 但这一行绝不会生效。只能靠猜,所以是"提醒 + 让用户拍板",不是硬拦
    // "不像命令"的那一类先查一下是不是真命令(make、ssh、docker……),是就不提醒;拼错关键字的那一类照常提醒
    const rawWarnings = lintShellSnippet(trimmedContent);
    const checks = await Promise.all(
      rawWarnings.map(async (w) =>
        w.code === "unknownAssignmentPrefix" ? !(await isKnownCommand(w.word, shellKind)) : true,
      ),
    );
    const warnings = rawWarnings.filter((_, i) => checks[i]);
    if (warnings.length > 0) {
      // Esc 必须等于"不保存、回去改":之前把"回去改"放在主按钮上,Esc 反而触发了另一个按钮把可疑内容存了进去。
      // 代价是回车变成"仍然保存",靠文案和按钮的红色提醒
      const proceed = await confirmAlert({
        title: t("es.lintConfirmTitle"),
        message: warnings.map(describeWarning).join("\n"),
        primaryAction: { title: t("es.lintIgnoreAction"), style: Alert.ActionStyle.Destructive },
        dismissAction: { title: t("es.lintFixAction") },
      });
      if (!proceed) return;
    }

    // 用探测到的真实 shell 类型做语法校验(zsh -n / bash -n);识别不出来则跳过,不阻断保存
    const validation = await validateShellSyntax(trimmedContent, shellKind);
    if (!validation.valid) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("es.syntaxFailedTitle", { shell: shellKind ?? "shell" }),
        message: validation.error,
      });
      setContentError(validation.error);
      return;
    }

    try {
      await onSave({
        name: trimmedName,
        type,
        content: trimmedContent,
        containsSecret,
        description: description.trim() || undefined,
        group,
        enabled,
      });
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={initialData ? t("es.navEdit", { name: initialData.name }) : t("es.navCreate")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("es.submitTitle")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("es.nameTitle")}
        placeholder={t("es.namePlaceholder")}
        value={name}
        onChange={(val) => {
          setName(val);
          setNameError(undefined);
        }}
        error={nameError}
      />
      <Form.Dropdown
        id="type"
        title={t("es.typeTitle")}
        value={type}
        onChange={handleTypeChange}
        placeholder={t("common.searchPlaceholder")}
      >
        <Form.Dropdown.Item value="export" title={t("es.typeExport")} />
        <Form.Dropdown.Item value="alias" title={t("es.typeAlias")} />
        <Form.Dropdown.Item value="snippet" title={t("es.typeSnippet")} />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title={t("es.contentTitle")}
        placeholder={SNIPPET_TEMPLATES[type]}
        value={content}
        onChange={(val) => {
          setContent(val);
          setContentError(undefined);
        }}
        error={contentError}
      />
      {typeMismatch && <Form.Description text={typeMismatchHint} />}
      <Form.TextField
        id="description"
        title={t("es.descTitle")}
        placeholder={t("es.descPlaceholder")}
        value={description}
        onChange={setDescription}
      />
      {groupFields}
      <Form.Checkbox id="enabled" label={t("es.enabledLabel")} value={enabled} onChange={setEnabled} />
      <Form.Checkbox
        id="containsSecret"
        label={t("es.containsSecretLabel")}
        value={containsSecret}
        onChange={setContainsSecret}
      />
    </Form>
  );
}
