import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { Fragment, useRef, useState } from "react";
import { actionDefinitions, type ActionId } from "../actions";
import {
  effectiveShortcuts,
  normalizeShortcut,
  validateShortcuts,
  type ShortcutOverrides,
} from "../shortcuts";

export function ShortcutSettings({
  overrides,
  error,
  onSave,
}: {
  overrides: ShortcutOverrides;
  error?: string;
  onSave: (value: ShortcutOverrides) => Promise<void>;
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.entries(effectiveShortcuts(overrides)).map(([id, value]) => [
        id,
        value ?? "",
      ]),
    ),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { pop } = useNavigation();
  const persist = async (next: ShortcutOverrides) => {
    if (savingRef.current) return;
    const validation = validateShortcuts(next);
    setErrors(validation);
    if (validation.length) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(next);
      await showToast({ style: Toast.Style.Success, title: "快捷键已保存" });
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "快捷键保存失败，请重试",
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const save = async () => {
    const next: ShortcutOverrides = {};
    const requested: ShortcutOverrides = {};
    try {
      for (const action of actionDefinitions) {
        const text = values[action.id]?.trim();
        const value = text ? normalizeShortcut(text) : null;
        requested[action.id] = value;
        if (value !== action.defaultShortcut) next[action.id] = value;
      }
    } catch (error) {
      setErrors([(error as Error).message]);
      return;
    }
    const validation = validateShortcuts(requested);
    if (validation.length) {
      setErrors(validation);
      return;
    }
    await persist(next);
  };
  return (
    <Form
      navigationTitle="快捷键设置"
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存快捷键"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action
            title="恢复默认快捷键"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => persist({})}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="设置说明"
        text="输入 cmd+shift+1、ctrl+o、shift+enter 等组合；留空停用该动作的额外绑定。菜单动作始终保留。第一、第二个结果动作仍由 Raycast 提供 Enter / ⌘Enter，无法在此停用；自定义键仅作为额外绑定。"
      />
      {error && <Form.Description title="配置状态" text={error} />}
      {errors.length > 0 && (
        <Form.Description title="请修改" text={errors.join("\n")} />
      )}
      {(["common", "tab", "bookmark", "history"] as const).map((group) => (
        <Fragment key={group}>
          <Form.Separator />
          <Form.Description
            title={
              {
                common: "通用",
                tab: "标签页",
                bookmark: "书签",
                history: "历史记录",
              }[group]
            }
            text="以下动作可分别设置快捷键。"
          />
          {actionDefinitions
            .filter((action) => action.group === group)
            .map((action) => (
              <Form.TextField
                key={action.id}
                id={action.id}
                title={action.title}
                value={values[action.id]}
                placeholder={
                  action.id === "newTab"
                    ? "宿主 ⌘Enter；可添加其他组合"
                    : action.id.endsWith(".open")
                      ? "宿主 Enter；可添加其他组合"
                      : "留空停用额外绑定"
                }
                onChange={(value) => {
                  setValues((previous) => ({
                    ...previous,
                    [action.id as ActionId]: value,
                  }));
                  setErrors([]);
                }}
              />
            ))}
        </Fragment>
      ))}
    </Form>
  );
}
