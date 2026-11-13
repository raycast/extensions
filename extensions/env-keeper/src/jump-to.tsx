import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { join } from "node:path";
import { useEffect, useState } from "react";
import {
  findShellConflicts,
  listPresetsForProject,
  type Preset,
  type ProjectMeta,
  type ShellConfig,
  type ShellSnippet,
  toggleShellSnippet,
} from "@env-keeper/core";
import { t } from "./i18n.js";
import { showFailureToast } from "./views/failureToast.js";
import {
  detectProjectEnvFiles,
  detectShellRc,
  loadPresets,
  loadRegistry,
  loadShellConfig,
  saveShellConfig,
} from "./services/storage.js";
import { PresetsStandaloneView } from "./views/PresetsStandaloneView.js";
import { ProjectDetailView } from "./views/ProjectDetailView.js";
import { ShellTrackView } from "./views/ShellTrackView.js";
import { conflictOthers, conflictWhat } from "./views/shellConflictText.js";

/**
 * Jump To:打几个字直接到插件里的某个地方。
 * 单位是"东西"(项目 / 环境文件 / 方案 / Shell 片段),不是变量——变量归 Search Env Vars,两边不重叠。
 * 分组不是一行结果,而是方案和片段的关键词:分组本身没有页面,跳到组员才有意义。
 */
export default function Command() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [envFiles, setEnvFiles] = useState<{ project: ProjectMeta; filename: string }[]>([]);
  const [presets, setPresets] = useState<{ project: ProjectMeta; preset: Preset }[]>([]);
  const [shell, setShell] = useState<ShellConfig>({ version: 1, snippets: [] });
  // rc 里没有 source 那一行时,片段再"已启用"也进不了终端,图标不能照旧显示绿色
  const [integrationActive, setIntegrationActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: reg }, presetsFile, shellConfig, rc] = await Promise.all([
        loadRegistry(),
        loadPresets(),
        loadShellConfig(),
        detectShellRc(),
      ]);
      setProjects(reg.projects);
      setShell(shellConfig.data);
      setIntegrationActive(rc.isSourced);

      const files = await Promise.all(
        reg.projects.map(async (project) => {
          try {
            return (await detectProjectEnvFiles(project.path)).map((filename) => ({ project, filename }));
          } catch {
            // 项目目录不在了就没有文件可列;项目本身仍列出来,进去能重新指向
            return [];
          }
        }),
      );
      setEnvFiles(files.flat());
      setPresets(
        reg.projects.flatMap((project) =>
          listPresetsForProject(presetsFile.data, project.id).map((preset) => ({ project, preset })),
        ),
      );
    } catch (e) {
      await showFailureToast(t("jt.loadFailedTitle"), e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 从启动器直接热插拔,不用进列表。读最新的再改,别拿这一页的旧快照去覆盖
  const handleToggleSnippet = async (id: string) => {
    try {
      await toggleSnippet(id);
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  const toggleSnippet = async (id: string) => {
    const latest = await loadShellConfig();
    if (latest.problem) {
      // 配置文件坏了就别在这里改;去 Shell 轨,那里有完整的提示和处理入口
      await showToast({
        style: Toast.Style.Failure,
        title:
          latest.problem.reason === "tooNew"
            ? t("cfg.tooNewTitle")
            : latest.problem.reason === "unreadable"
              ? t("cfg.unreadableTitle")
              : t("cfg.corruptedTitle"),
        message: t("jt.problemHint"),
      });
      return;
    }
    const updated = toggleShellSnippet(latest.data, id);
    await saveShellConfig(updated);
    setShell(updated);
    // 跟 Shell 轨一致:启用后撞上同名变量 / alias 要提一句
    const conflict = findShellConflicts(updated.snippets).find((c) => c.snippets.some((x) => x.id === id));
    await showToast({
      style: Toast.Style.Success,
      title: t("st.toggledToast"),
      message: conflict
        ? t("st.conflictToast", {
            what: conflictWhat(conflict),
            others: conflictOthers(conflict, id),
            effective: conflict.snippets.find((x) => x.id === conflict.effectiveId)?.name ?? "",
          })
        : undefined,
    });
  };

  const total = projects.length + envFiles.length + presets.length + shell.snippets.length;

  return (
    <List isLoading={loading} searchBarPlaceholder={t("jt.placeholder")}>
      {projects.length > 0 && (
        <List.Section title={t("jt.sectionProjects")} subtitle={t("pd.countItems", { count: projects.length })}>
          {projects.map((project) => (
            <List.Item
              key={`p_${project.id}`}
              icon={Icon.Folder}
              title={project.name}
              subtitle={project.path}
              keywords={[project.path]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t("jt.actionOpenProject")}
                    icon={Icon.ArrowRight}
                    target={<ProjectDetailView project={project} />}
                  />
                  <Action.ShowInFinder title={t("jt.actionShowInFinder")} path={project.path} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {envFiles.length > 0 && (
        <List.Section title={t("jt.sectionEnvFiles")} subtitle={t("pd.countItems", { count: envFiles.length })}>
          {envFiles.map(({ project, filename }) => (
            <List.Item
              key={`f_${project.id}_${filename}`}
              icon={Icon.Document}
              title={filename}
              subtitle={project.name}
              keywords={[project.name]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t("jt.actionOpenFile")}
                    icon={Icon.ArrowRight}
                    target={<ProjectDetailView project={project} initialEnvFile={filename} />}
                  />
                  <Action.OpenWith title={t("mv.actionOpenWith")} path={join(project.path, filename)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {presets.length > 0 && (
        <List.Section title={t("jt.sectionPresets")} subtitle={t("pd.countItems", { count: presets.length })}>
          {presets.map(({ project, preset }) => (
            <List.Item
              key={`ps_${preset.id}`}
              icon={Icon.Box}
              title={preset.name}
              subtitle={
                preset.group ? t("jt.presetSubtitle", { project: project.name, group: preset.group }) : project.name
              }
              keywords={[project.name, ...(preset.group ? [preset.group] : []), ...(preset.note ? [preset.note] : [])]}
              accessories={preset.note ? [{ text: preset.note }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t("jt.actionOpenPreset")}
                    icon={Icon.ArrowRight}
                    target={<PresetsStandaloneView project={project} presetId={preset.id} />}
                  />
                  {/* 方案内容可能带明文密钥,不进剪贴板历史 */}
                  <Action.CopyToClipboard title={t("jt.actionCopyPresetContent")} content={preset.content} concealed />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {shell.snippets.length > 0 && (
        <List.Section title={t("jt.sectionSnippets")} subtitle={t("pd.countItems", { count: shell.snippets.length })}>
          {shell.snippets.map((snippet) => (
            <List.Item
              key={`sh_${snippet.id}`}
              icon={
                !snippet.enabled
                  ? { source: Icon.Pause, tintColor: Color.SecondaryText }
                  : integrationActive
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.CheckCircle, tintColor: Color.SecondaryText }
              }
              title={snippet.name}
              subtitle={
                snippet.group
                  ? t("jt.snippetSubtitle", { group: snippet.group, type: snippetTypeLabel(snippet) })
                  : snippetTypeLabel(snippet)
              }
              keywords={[
                ...snippetTypeKeywords(snippet),
                ...(snippet.group ? [snippet.group] : []),
                ...(snippet.description ? [snippet.description] : []),
              ]}
              accessories={snippet.description ? [{ text: snippet.description }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t("jt.actionOpenSnippet")}
                    icon={Icon.Terminal}
                    target={<ShellTrackView initialSelectedId={snippet.id} />}
                  />
                  <Action
                    title={snippet.enabled ? t("st.actionDisable") : t("st.actionEnable")}
                    icon={snippet.enabled ? Icon.Pause : Icon.Play}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => handleToggleSnippet(snippet.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {total === 0 && !loading && <List.EmptyView title={t("jt.emptyTitle")} description={t("jt.emptyDesc")} />}
    </List>
  );
}

function snippetTypeLabel(snippet: ShellSnippet): string {
  if (snippet.type === "export") return t("jt.typeExport");
  if (snippet.type === "alias") return t("jt.typeAlias");
  return t("jt.typeSnippet");
}

// 跟 Shell 轨列表用同一组词,用户在那边学会的搜法这里也管用
function snippetTypeKeywords(snippet: ShellSnippet): string[] {
  if (snippet.type === "export") return ["export", "变量"];
  if (snippet.type === "alias") return ["alias", "别名"];
  return ["snippet", "脚本"];
}
