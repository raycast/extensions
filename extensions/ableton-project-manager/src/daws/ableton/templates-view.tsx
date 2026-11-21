import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import { getDawLabels, getTemplateLabels } from "@/daws/labels";
import { openWithDaw } from "@/core/daw-app";
import { showFailure } from "@/core/ui/toast";
import { defaultTemplatesFolder, isTemplate, listTemplates, type Template, type TemplateGroup } from "./templates";

const settings = getSettings();
const t = getTranslations(settings.language);
const labels = getDawLabels(settings.language);
const templateLabels = getTemplateLabels(settings.language);

// 偏好项只在需要它的仓库的 package.json 里声明，所以这里自己写类型。
function templatesFolderPreference(): string | undefined {
  return getPreferenceValues<{ templatesFolder?: string }>().templatesFolder || undefined;
}

// 没设 Templates Folder 时用 Live 自己的默认位置。
const TEMPLATES_FOLDER = templatesFolderPreference() ?? defaultTemplatesFolder();

/** 模板列表：顶层一组，每个直接子文件夹一组。模板原件只读，这里只打开、改名、移到废纸篓。 */
export function TemplatesView() {
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setGroups(listTemplates(TEMPLATES_FOLDER, isTemplate));
    setIsLoading(false);
  }, []);

  useEffect(reload, [reload]);

  // 和打开已有 Set 一样：用 Live 打开模板原件，然后关掉 Raycast 窗口。
  async function handleCreate(template: Template) {
    try {
      await openWithDaw(template.path);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  }

  async function handleTrash(template: Template) {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${templateLabels.templateTrashHint}\n${template.name}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(template.path);
      reload();
      await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: template.name });
    } catch (error) {
      await showFailure(t.trashFailed, error);
    }
  }

  const renderTemplate = (template: Template) => (
    <List.Item
      key={template.path}
      icon="set.png"
      title={template.name}
      actions={
        <ActionPanel>
          <Action
            title={templateLabels.createLiveSet}
            icon={Icon.NewDocument}
            onAction={() => handleCreate(template)}
          />
          <Action.ShowInFinder path={template.path} title={t.showInFinder} />
          <Action.Push
            title={t.rename}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RenameTemplate template={template} onRenamed={reload} />}
          />
          <Action
            title={t.moveToTrash}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleTrash(template)}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={templateLabels.newProjectWithTemplate}
      searchBarPlaceholder={templateLabels.searchTemplates}
    >
      {!isLoading && groups.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title={templateLabels.noTemplates}
          description={templateLabels.noTemplatesHint.replace("{folder}", TEMPLATES_FOLDER)}
          actions={
            <ActionPanel>
              <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.title ?? ""} title={group.title ?? templateLabels.templates}>
          {group.templates.map(renderTemplate)}
        </List.Section>
      ))}
    </List>
  );
}

/** 模板改名：只在同一个文件夹里改，后缀保持不变。 */
function RenameTemplate({ template, onRenamed }: { template: Template; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(template.name);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }
    if (trimmed === template.name) {
      pop();
      return;
    }

    const target = path.join(path.dirname(template.path), `${trimmed}${path.extname(template.path)}`);
    if (fs.existsSync(target)) {
      await showToast({ style: Toast.Style.Failure, title: templateLabels.templateNameExists });
      return;
    }

    try {
      fs.renameSync(template.path, target);
    } catch (error) {
      await showFailure(t.renameFailed, error);
      return;
    }
    onRenamed();
    await showToast({ style: Toast.Style.Success, title: t.renamed, message: trimmed });
    pop();
  }

  return (
    <Form
      navigationTitle={`${t.rename} — ${template.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.rename} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={template.name} value={name} onChange={setName} />
    </Form>
  );
}
