import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { resolveWorktreeDeckCompositionRoot } from "../composition-root";
import { worktreeIdeAppService, type WorktreeIdeApp } from "../domain/worktree-ide-app.service";
import { RepositoryMappingManager } from "./repository-mapping-manager";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();
const { loadPreferredIdeApp, savePreferredIdeApp } = WORKTREE_DECK_COMPOSITION_ROOT.generalSettingsStore;

/**
 * アプリケーション設定カテゴリの識別子
 */
export type SettingsItemId = "general" | "repositories";

/**
 * アプリケーション設定カテゴリの表示情報
 */
export type SettingsItem = {
  id: SettingsItemId;
  title: string;
  subtitle: string;
  icon: Icon;
};

type SettingsViewProps = {
  onGeneralSettingsChange?: (ideApp: WorktreeIdeApp) => void;
  onRepositoryMappingChange?: () => void;
};

/**
 * アプリケーション利用中に変更する設定カテゴリを返す
 */
export function buildSettingsItems(): SettingsItem[] {
  return [
    {
      id: "general",
      title: "General Settings",
      subtitle: "Choose the IDE used to open workspaces and files.",
      icon: Icon.Gear,
    },
    {
      id: "repositories",
      title: "Repositories",
      subtitle: "Register repository roots and display names.",
      icon: Icon.Folder,
    },
  ];
}

/**
 * アプリケーション設定の総合窓口を表示する
 */
export function SettingsView({ onGeneralSettingsChange, onRepositoryMappingChange }: SettingsViewProps) {
  const items = buildSettingsItems();

  return (
    <List searchBarPlaceholder="Search settings">
      <List.Section title="General">
        {items.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            actions={
              <ActionPanel>
                {item.id === "general" ? (
                  <Action.Push
                    title="Open General Settings"
                    icon={Icon.Gear}
                    target={<GeneralSettingsForm onSave={onGeneralSettingsChange} />}
                  />
                ) : null}
                {item.id === "repositories" ? (
                  <Action.Push
                    title="Open Repositories"
                    icon={Icon.Folder}
                    target={<RepositoryMappingManager onChange={onRepositoryMappingChange} />}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type GeneralSettingsFormValues = {
  ideApp: string;
};

type GeneralSettingsFormProps = {
  onSave?: (ideApp: WorktreeIdeApp) => void;
};

/**
 * IDE アプリケーション値をフォーム入力から解決する
 */
export function resolveGeneralSettingsIdeApp(value: string): WorktreeIdeApp {
  return worktreeIdeAppService.resolvePreferred(worktreeIdeAppService.normalizeIdeApp(value));
}

/**
 * General Settings 入力フォームを表示する
 */
export function GeneralSettingsForm({ onSave }: GeneralSettingsFormProps) {
  const { pop } = useNavigation();
  const [ideApp, setIdeApp] = useState<WorktreeIdeApp>("zed");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSettings(): Promise<void> {
      setIsLoading(true);
      try {
        const loadedIdeApp = await loadPreferredIdeApp();
        if (active) {
          setIdeApp(loadedIdeApp);
        }
      } catch (error) {
        if (active) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load settings",
            message: formatSettingsError(error),
          });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  /**
   * General Settings を保存する
   */
  const handleSubmit = useCallback(
    async (values: GeneralSettingsFormValues) => {
      try {
        const savedIdeApp = await savePreferredIdeApp(resolveGeneralSettingsIdeApp(values.ideApp));
        setIdeApp(savedIdeApp);
        onSave?.(savedIdeApp);
        await showToast({ style: Toast.Style.Success, title: "Settings saved" });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save settings",
          message: formatSettingsError(error),
        });
      }
    },
    [onSave, pop],
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="ideApp"
        title="IDE"
        value={ideApp}
        onChange={(value) => setIdeApp(resolveGeneralSettingsIdeApp(value))}
      >
        {worktreeIdeAppService.listIdeAppOptions().map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

/**
 * settings 関連のエラーを文字列に整形する
 */
function formatSettingsError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
