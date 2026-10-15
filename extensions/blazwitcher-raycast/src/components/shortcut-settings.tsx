import {
  Action,
  ActionPanel,
  BrowserExtension,
  Form,
  Icon,
  Toast,
  environment,
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
  const detailAvailable = environment.canAccess(BrowserExtension);
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
      await showToast({ style: Toast.Style.Success, title: "Shortcuts Saved" });
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Shortcuts",
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
      navigationTitle="Shortcut Settings"
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Shortcuts"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action
            title="Restore Default Shortcuts"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => persist({})}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Instructions"
        text="Enter a combination such as cmd+shift+1, ctrl+o, or shift+enter. Leave a field blank to disable its additional shortcut. Actions remain available in the menu. Raycast always assigns Enter and ⌘Enter to the first two result actions; custom shortcuts are additional bindings."
      />
      {error && <Form.Description title="Configuration Status" text={error} />}
      {errors.length > 0 && (
        <Form.Description
          title="Fix These Shortcuts"
          text={errors.join("\n")}
        />
      )}
      {(["common", "tab", "bookmark", "history"] as const).map((group) => (
        <Fragment key={group}>
          <Form.Separator />
          <Form.Description
            title={
              {
                common: "General",
                tab: "Tabs",
                bookmark: "Bookmarks",
                history: "History",
              }[group]
            }
            text="Set a shortcut for each action below."
          />
          {actionDefinitions
            .filter(
              (action) =>
                action.group === group &&
                (action.id !== "toggleDetail" || detailAvailable),
            )
            .map((action) => (
              <Form.TextField
                key={action.id}
                id={action.id}
                title={action.title}
                value={values[action.id]}
                placeholder={
                  action.id === "newTab"
                    ? "Raycast uses ⌘Enter; add another shortcut"
                    : action.id.endsWith(".open")
                      ? "Raycast uses Enter; add another shortcut"
                      : "Leave blank to disable the additional shortcut"
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
