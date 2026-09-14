import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createEmptyPresetsFile,
  groupPresets,
  listPresetGroups,
  addPreset,
  listPresetsForProject,
  parseEnv,
  type Preset,
  type PresetsFile,
  recordPresetApplied,
  removePreset,
  renamePresetGroup,
  updatePreset,
} from "@env-keeper/core";
import type { PresetMetaData } from "./PresetMetaForm.js";
import { t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { runLoad } from "./loadState.js";
import { type ConfigLoadProblem, loadPresets, savePresets } from "../services/storage.js";
import { ConfigProblemItem } from "./ConfigProblemItem.js";
import { PresetContentForm } from "./PresetContentForm.js";
import { PresetDiffView } from "./PresetDiffView.js";
import { PresetMetaForm } from "./PresetMetaForm.js";
import { PresetsHistoryView } from "./PresetsHistoryView.js";
import { RenameGroupForm } from "./RenameGroupForm.js";

/** 分组筛选里"未分组"那一项的值。组名存进去前都裁过空白,带前导空格的值不可能撞上真实组名 */
const UNGROUPED_FILTER = " ungrouped";

interface PresetsViewProps {
  projectId: string;
  projectName: string;
  /** 当前正在看的环境文件,"套用到 X""跟 X 比较"里的 X */
  envFilename: string;
  currentContent: string;
  customSecrets?: string[];
  /** 真正写文件的动作交给父页面(写入、记录套用状态);确认这一步由差异页承担,这里负责把人带过去 */
  onApply: (preset: Preset) => Promise<void>;
  /** 这里改了方案(改名/改内容/删除)之后通知父页面重读 */
  onChanged: () => void;
  /** 从 Jump To 跳过来时,直接选中那份方案 */
  initialSelectedId?: string;
}

/**
 * 管理方案。按分组分段(组名字母序,未分组固定最后),每项可改名/改内容/看差异/删除。
 * 自己读 presets.json 而不是从父页面拿:这一页会反复改动方案,拿快照进来一改就旧了
 */
export function PresetsView({
  projectId,
  projectName,
  envFilename,
  currentContent,
  customSecrets,
  onApply,
  onChanged,
  initialSelectedId,
}: PresetsViewProps) {
  const { push, pop } = useNavigation();
  // 只有从 Jump To 跳过来时才接管选中项;平时交给 Raycast 自己管(同 ShellTrackView)
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialSelectedId);
  const [file, setFile] = useState<PresetsFile>(createEmptyPresetsFile());
  const [problem, setProblem] = useState<ConfigLoadProblem | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    runLoad(
      setLoading,
      async () => {
        const result = await loadPresets();
        setFile(result.data);
        setProblem(result.problem);
      },
      "ps.loadFailedTitle",
    );

  useEffect(() => {
    refresh();
  }, []);

  const persist = async (next: PresetsFile) => {
    await savePresets(next);
    setFile(next);
    onChanged();
  };

  const presets = listPresetsForProject(file, projectId);
  const groups = listPresetGroups(file, projectId);
  const activeIds = new Set(presets.filter((p) => p.content === currentContent).map((p) => p.id));
  // 分组筛选:"" 全部;UNGROUPED_FILTER 只看没分组的;其余是组名。一个分组都没有时下拉框不出现,也不筛
  const [groupFilter, setGroupFilter] = useState("");
  const visiblePresets =
    groups.length === 0 || groupFilter === ""
      ? presets
      : presets.filter((p) => (groupFilter === UNGROUPED_FILTER ? !p.group : p.group === groupFilter));
  const varCount = (p: Preset) => parseEnv(p.content).filter((l) => l.type === "kv").length;
  const groupSize = (group: string) => presets.filter((p) => p.group === group).length;

  /** 改组名 / 解散组之后,正筛着这个组的话筛选会落空,退回"全部" */
  const persistGroupChange = async (next: PresetsFile, from: string) => {
    await persist(next);
    if (groupFilter === from) setGroupFilter("");
  };

  const handleDissolveGroup = async (group: string) => {
    const confirmed = await confirmDestructive({
      title: t("grp.dissolveTitle", { group }),
      message: t("grp.dissolveMessage", { count: groupSize(group) }),
      actionTitle: t("grp.dissolveConfirm"),
    });
    if (!confirmed) return;
    await persistGroupChange(renamePresetGroup(file, projectId, group, undefined), group);
    await showToast({ style: Toast.Style.Success, title: t("grp.dissolvedToast", { group }) });
  };

  // 新建的两条路在这一页也要有:一个叫"管理 X"的页面不能新建 X 说不过去,空状态还把人推回上一页
  const handleSaveAs = async (data: PresetMetaData) => {
    const { file: next, preset } = addPreset(file, {
      projectId,
      name: data.name,
      note: data.note,
      group: data.group,
      content: currentContent,
    });
    // 刚存的那份跟文件当然一致;顺手记成"已套用",之后一改就能提示漂移
    await persist(recordPresetApplied(next, projectId, envFilename, preset.id));
    await showToast({ style: Toast.Style.Success, title: t("ps.savedToast", { name: preset.name }) });
  };

  const handleCreateBlank = async (data: PresetMetaData) => {
    const { file: next, preset } = addPreset(file, {
      projectId,
      name: data.name,
      note: data.note,
      group: data.group,
      content: data.content ?? "",
    });
    await persist(next);
    await showToast({ style: Toast.Style.Success, title: t("ps.savedToast", { name: preset.name }) });
  };

  const existingNames = presets.map((p) => p.name);
  const createActions = (
    <ActionPanel.Section title={t("ps.sectionCreate")}>
      <Action.Push
        title={t("ps.saveAsNew")}
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        target={
          <PresetMetaForm
            existingGroups={groups}
            existingNames={existingNames}
            contentPreview={{ content: currentContent, sourceFile: envFilename, customSecrets }}
            onSave={handleSaveAs}
          />
        }
      />
      <Action.Push
        title={t("ps.createBlank")}
        icon={Icon.NewDocument}
        shortcut={Keyboard.Shortcut.Common.New}
        target={
          <PresetMetaForm
            navTitle={t("ps.createBlank")}
            existingGroups={groups}
            existingNames={existingNames}
            editableContent
            onSave={handleCreateBlank}
          />
        }
      />
    </ActionPanel.Section>
  );

  const handleDelete = async (preset: Preset) => {
    const confirmed = await confirmDestructive({
      title: t("ps.deleteConfirmTitle", { name: preset.name }),
      message: t("ps.deleteConfirmMessage"),
      actionTitle: t("common.delete"),
    });
    if (!confirmed) return;
    await persist(removePreset(file, preset.id));
    await showToast({ style: Toast.Style.Success, title: t("ps.deletedToast", { name: preset.name }) });
  };

  return (
    <List
      isLoading={loading}
      navigationTitle={t("ps.navTitle", { project: projectName })}
      searchBarPlaceholder={t("ps.searchPlaceholder")}
      {...(initialSelectedId
        ? { selectedItemId, onSelectionChange: (id: string | null) => setSelectedItemId(id ?? undefined) }
        : {})}
      searchBarAccessory={
        groups.length > 0 ? (
          <List.Dropdown tooltip={t("ps.groupFilterTooltip")} value={groupFilter} onChange={setGroupFilter}>
            <List.Dropdown.Item value="" title={t("ps.groupFilterAll")} />
            {groups.map((g) => (
              <List.Dropdown.Item key={g} value={g} title={g} />
            ))}
            <List.Dropdown.Item value={UNGROUPED_FILTER} title={t("grp.ungrouped")} />
          </List.Dropdown>
        ) : undefined
      }
    >
      {problem && (
        <List.Section title={t("cfg.sectionTitle")}>
          <ConfigProblemItem problem={problem} />
        </List.Section>
      )}

      {/* 一个分组都没有时不摆区块标题:只有一个"未分组"区块还带标题,纯属噪音 */}
      {groupPresets(visiblePresets).map((bucket) => (
        <List.Section
          key={bucket.group ?? "__ungrouped__"}
          title={
            groups.length > 0
              ? bucket.group
                ? t("grp.section", { group: bucket.group })
                : t("grp.ungrouped")
              : undefined
          }
          subtitle={groups.length > 0 ? t("ps.groupSectionCount", { count: bucket.presets.length }) : undefined}
        >
          {bucket.presets.map((preset) => (
            <List.Item
              key={preset.id}
              id={preset.id}
              icon={Icon.Box}
              title={preset.name}
              subtitle={preset.note}
              keywords={preset.group ? [preset.group] : undefined}
              accessories={[
                ...(activeIds.has(preset.id)
                  ? [{ tag: { value: t("ps.liveAccessory", { file: envFilename }), color: Color.Green } }]
                  : []),
                { text: t("ps.varCount", { count: varCount(preset) }) },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={t("ps.actionApply", { file: envFilename })}
                      icon={Icon.Replace}
                      onAction={async () => {
                        // 套用完回到文件页看结果:这一页拿到的"当前内容"是进来时的快照,套完就旧了
                        if (currentContent.trim() === "") {
                          await onApply(preset);
                          pop();
                          return;
                        }
                        push(
                          <PresetDiffView
                            preset={preset}
                            envFilename={envFilename}
                            currentContent={currentContent}
                            customSecrets={customSecrets}
                            mode="apply"
                            onApply={async () => {
                              await onApply(preset);
                              pop();
                            }}
                          />,
                        );
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title={t("ps.actionEditContent")}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <PresetContentForm
                          preset={preset}
                          onSave={async (content) => {
                            await persist(updatePreset(file, preset.id, { content }));
                            await showToast({
                              style: Toast.Style.Success,
                              title: t("ps.updatedToast", { name: preset.name }),
                            });
                          }}
                        />
                      }
                    />
                    <Action.Push
                      title={t("ps.actionEditMeta")}
                      icon={Icon.Tag}
                      target={
                        <PresetMetaForm
                          initialData={preset}
                          existingGroups={groups}
                          existingNames={existingNames.filter((n) => n !== preset.name)}
                          onSave={async (data) => {
                            await persist(updatePreset(file, preset.id, data));
                            await showToast({
                              style: Toast.Style.Success,
                              title: t("ps.updatedToast", { name: data.name }),
                            });
                          }}
                        />
                      }
                    />
                    {/* 复制一份再改名,比从零写省事:同类方案多半只差两三个值。
                        内容沿用原件,不在这一步展示明文——要改值走「编辑内容」 */}
                    <Action.Push
                      title={t("ps.actionDuplicate")}
                      icon={Icon.Duplicate}
                      target={
                        <PresetMetaForm
                          navTitle={t("ps.actionDuplicate")}
                          initialData={{
                            name: t("ps.duplicateName", { name: preset.name }),
                            note: preset.note,
                            group: preset.group,
                          }}
                          existingGroups={groups}
                          existingNames={existingNames}
                          contentPreview={{ content: preset.content, sourceFile: preset.name, customSecrets }}
                          onSave={async (data) => {
                            const { file: next, preset: copy } = addPreset(file, {
                              projectId,
                              name: data.name,
                              note: data.note,
                              group: data.group,
                              content: preset.content,
                            });
                            await persist(next);
                            await showToast({
                              style: Toast.Style.Success,
                              title: t("ps.savedToast", { name: copy.name }),
                            });
                          }}
                        />
                      }
                    />
                    {/* 方案内容可能带明文密钥,不进 Raycast 的剪贴板历史 */}
                    <Action.CopyToClipboard title={t("ps.actionCopy")} content={preset.content} concealed />
                    <Action
                      title={t("ps.actionDelete")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(preset)}
                    />
                  </ActionPanel.Section>

                  {/* 分组只是散落在每份方案上的字段,区块标题挂不了动作,所以从组里任意一份方案进 */}
                  {preset.group && (
                    <ActionPanel.Section>
                      <Action.Push
                        title={t("grp.actionRename", { group: preset.group })}
                        icon={Icon.Pencil}
                        target={
                          <RenameGroupForm
                            group={preset.group}
                            count={groupSize(preset.group)}
                            otherGroups={groups.filter((g) => g !== preset.group)}
                            onRename={async (to) => {
                              const from = preset.group as string;
                              await persistGroupChange(renamePresetGroup(file, projectId, from, to), from);
                              await showToast({
                                style: Toast.Style.Success,
                                title: t("grp.renamedToast", { from, to }),
                              });
                            }}
                          />
                        }
                      />
                      <Action
                        title={t("grp.actionDissolve", { group: preset.group })}
                        icon={Icon.Eraser}
                        style={Action.Style.Destructive}
                        onAction={() => handleDissolveGroup(preset.group as string)}
                      />
                    </ActionPanel.Section>
                  )}

                  {createActions}

                  <ActionPanel.Section>
                    <Action.Push
                      title={t("ps.actionFocusHistory")}
                      icon={Icon.Clock}
                      target={
                        <PresetsHistoryView
                          projectId={projectId}
                          projectName={projectName}
                          customSecrets={customSecrets}
                          focusPreset={{ id: preset.id, name: preset.name }}
                          onRestored={() => {
                            refresh();
                            onChanged();
                          }}
                        />
                      }
                    />
                    <Action.Push
                      title={t("ps.actionHistory")}
                      icon={Icon.Rewind}
                      target={
                        <PresetsHistoryView
                          projectId={projectId}
                          projectName={projectName}
                          customSecrets={customSecrets}
                          onRestored={() => {
                            refresh();
                            onChanged();
                          }}
                        />
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {presets.length === 0 && !loading && !problem && (
        <List.EmptyView
          title={t("ps.emptyTitle")}
          description={t("ps.emptyDesc")}
          actions={
            <ActionPanel>
              {createActions}
              <Action.Push
                title={t("ps.actionHistory")}
                icon={Icon.Rewind}
                target={
                  <PresetsHistoryView
                    projectId={projectId}
                    projectName={projectName}
                    customSecrets={customSecrets}
                    onRestored={() => {
                      refresh();
                      onChanged();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
