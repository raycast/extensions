import { Action, ActionPanel, Color, confirmAlert, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  type ShellConfig,
  type ShellConflict,
  type ShellSnippet,
  addShellSnippet,
  adjacentInGroupIndex,
  findShellConflicts,
  generateShellScript,
  groupShellSnippets,
  listShellGroups,
  renameShellGroup,
  setShellGroupEnabled,
  maskShellContent,
  moveShellSnippet,
  removeShellSnippet,
  toggleShellSnippet,
  updateShellSnippet,
} from "@env-keeper/core";
import { snapshotLimitHint, t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { showFailureToast } from "./failureToast.js";
import type { ValidatableShell } from "../services/shellValidator.js";
import {
  appendShellSourceLine,
  detectShellRc,
  getShellRefreshCommand,
  getShellScriptPath,
  getShellSourceLine,
  type ConfigLoadProblem,
  getBaseDir,
  loadShellConfig,
  readShellScript,
  removeShellSourceLine,
  saveShellConfig,
  type ShellRcInfo,
} from "../services/storage.js";
import { ConfigProblemItem } from "./ConfigProblemItem.js";
import { ShellConfigHistoryView } from "./ShellConfigHistoryView.js";
import { ShellRcBackupsView } from "./ShellRcBackupsView.js";
import { EditShellSnippetForm } from "./EditShellSnippetForm.js";
import { RenameGroupForm } from "./RenameGroupForm.js";
import { conflictOthers, conflictWhat, describeConflict } from "./shellConflictText.js";
import { copyRefreshCommand } from "./refreshCommand.js";

interface ShellTrackViewProps {
  /**
   * 轨道切换下拉框,由 manage-envs.tsx 传入,挂在这里唯一的 <List> 上(不要在外层再包一层 List)。
   * 类型要跟 List 的 searchBarAccessory 对齐:它只收 List.Dropdown 元素,ReactNode 太宽了
   */
  searchBarAccessory?: List.Props["searchBarAccessory"];
  /** 从全局搜索跳过来时,直接选中搜到的那个片段 */
  initialSelectedId?: string;
}

export function ShellTrackView({ searchBarAccessory, initialSelectedId }: ShellTrackViewProps) {
  const [config, setConfig] = useState<ShellConfig>({ version: 1, snippets: [] });
  const [loading, setLoading] = useState(true);
  const [rcInfo, setRcInfo] = useState<ShellRcInfo | null>(null);
  const [configProblem, setConfigProblem] = useState<ConfigLoadProblem | undefined>();
  // 片段内容默认打码,和项目轨的行为对齐;需要看明文时手动切开
  const [revealSecrets, setRevealSecrets] = useState(false);
  // 只有从全局搜索跳过来时才接管选中项;平时交给 Raycast 自己管
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialSelectedId);

  const refreshConfig = async () => {
    setLoading(true);
    try {
      const [loaded, rc] = await Promise.all([loadShellConfig(), detectShellRc()]);
      setConfig(loaded.data);
      setConfigProblem(loaded.problem);
      setRcInfo(rc);
    } catch (e) {
      await showFailureToast(t("st.loadFailedTitle"), e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  // 启用 Shell 集成:把 source 那一行写入用户的 shell 配置文件(先弹确认框讲清楚会发生什么,确认后才写)
  const handleEnableIntegration = async (rc: ShellRcInfo, sourceLine: string) => {
    const confirmed = await confirmAlert({
      title: t("st.enableConfirmTitle"),
      message: t("st.enableConfirmMessage", { file: rc.rcLabel, sourceLine }),
      primaryAction: {
        title: t("st.enableConfirmAction"),
      },
      dismissAction: {
        title: t("common.cancel"),
      },
    });
    if (!confirmed) return;

    try {
      // 动 .zshrc 之前存的那份副本,得让用户看见——不然这份保险等于不存在
      const { backupPath } = await appendShellSourceLine(rc.rcPath, sourceLine);
      await showToast({
        style: Toast.Style.Success,
        title: t("st.enabledIntegrationToast"),
        message: backupPath ? t("st.rcBackupNote", { path: backupPath }) : undefined,
      });
      await refreshConfig();
    } catch (e) {
      await showFailureToast(t("st.enableFailedTitle"), e);
    }
  };

  // 禁用 Shell 集成:与启用对称,从配置文件里干净移除那一行(先确认,防止手误)
  const handleDisableIntegration = async (rc: ShellRcInfo, sourceLine: string) => {
    const confirmed = await confirmDestructive({
      title: t("st.disableConfirmTitle"),
      message: t("st.disableConfirmMessage", { file: rc.rcLabel, sourceLine }),
      actionTitle: t("st.disableConfirmAction"),
    });
    if (!confirmed) return;

    try {
      const { removed, backupPath, customLineFound } = await removeShellSourceLine(rc.rcPath);
      // 那一行本来就不在(用户手动删过、rc 文件不存在),或者是用户自己改过的写法:如实说,别报"已移除"
      if (!removed) {
        await showToast({
          style: Toast.Style.Failure,
          title: customLineFound
            ? t("st.disableCustomLineTitle", { file: rc.rcLabel })
            : t("st.disableNotFoundTitle", { file: rc.rcLabel }),
          message: customLineFound ? t("st.disableCustomLineMessage") : t("st.disableNotFoundMessage"),
        });
        await refreshConfig();
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: t("st.disabledIntegrationToast", { file: rc.rcLabel }),
        message: backupPath ? t("st.rcBackupNote", { path: backupPath }) : undefined,
      });
      await refreshConfig();
    } catch (e) {
      await showFailureToast(t("st.disableFailedTitle"), e);
    }
  };

  /** 改完之后这一段若跟别的已启用片段设置了同一个东西,在 toast 里提一句;只提示不阻断 */
  const saveHint = (updated: ShellConfig, id: string, snapshot: Parameters<typeof snapshotLimitHint>[0]) => {
    const conflict = findShellConflicts(updated.snippets).find((c) => c.snippets.some((x) => x.id === id));
    const conflictHint = conflict
      ? t("st.conflictToast", {
          what: conflictWhat(conflict),
          others: conflictOthers(conflict, id),
          effective: conflict.snippets.find((x) => x.id === conflict.effectiveId)?.name ?? "",
        })
      : undefined;
    return [conflictHint, snapshotLimitHint(snapshot)].filter(Boolean).join(" · ") || undefined;
  };

  /**
   * 所有"改配置"的动作都走这里:先重读磁盘再套改动、再存、再提示。
   * 重读是因为 Jump to 也能启停片段,而这一页拿着的是打开时的旧数据,直接拿它写会把别处的改动盖回去;
   * 出错要抛出去——磁盘满、没权限时此前八个动作全部静默,用户看到的是"点了没反应"
   */
  const commit = async (
    mutate: (latest: ShellConfig) => ShellConfig,
    describe: (
      updated: ShellConfig,
      snapshot: Parameters<typeof snapshotLimitHint>[0],
    ) => { title: string; message?: string },
  ): Promise<void> => {
    const latest = await loadShellConfig();
    if (latest.problem) {
      throw new Error(latest.problem.reason === "unreadable" ? t("cfg.unreadableTitle") : t("cfg.corruptedTitle"));
    }
    const updated = mutate(latest.data);
    if (updated === latest.data) {
      setConfig(latest.data);
      return;
    }
    const snapshot = await saveShellConfig(updated);
    setConfig(updated);
    const { title, message } = describe(updated, snapshot);
    await showToast({ style: Toast.Style.Success, title, message });
  };

  /** 列表里直接触发的动作没有表单兜底,出错在这里提示 */
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  const handleToggle = (id: string) =>
    run(() =>
      commit(
        (latest) => toggleShellSnippet(latest, id),
        (updated, snapshot) => ({ title: t("st.toggledToast"), message: saveHint(updated, id, snapshot) }),
      ),
    );

  // 表单调用的两个不包 run:失败要抛给表单,表单会提示并留在原地,内容不丢
  const handleAdd = async (data: Omit<ShellSnippet, "id">) => {
    let newId = "";
    await commit(
      (latest) => {
        const { config: updated, snippet } = addShellSnippet(latest, data);
        newId = snippet.id;
        return updated;
      },
      (updated, snapshot) => ({ title: t("st.addedToast"), message: saveHint(updated, newId, snapshot) }),
    );
  };

  const handleEdit = (id: string, data: Omit<ShellSnippet, "id">) =>
    commit(
      (latest) => updateShellSnippet(latest, id, data),
      (updated, snapshot) => ({ title: t("st.updatedToast"), message: saveHint(updated, id, snapshot) }),
    );

  const handleSetGroupEnabled = (group: string, enabled: boolean) =>
    run(() =>
      commit(
        (latest) => setShellGroupEnabled(latest, group, enabled),
        (updated, snapshot) => {
          // 整组打开后可能跟组外的片段撞上,挑组里第一条有冲突的提一句
          const members = updated.snippets.filter((s) => s.group === group);
          const hit = enabled
            ? findShellConflicts(updated.snippets).find((c) =>
                c.snippets.some((x) => members.some((m) => m.id === x.id)),
              )
            : undefined;
          const hitId = hit?.snippets.find((x) => members.some((m) => m.id === x.id))?.id;
          return {
            title: enabled ? t("st.groupEnabledToast", { group }) : t("st.groupDisabledToast", { group }),
            message: hitId ? saveHint(updated, hitId, snapshot) : snapshotLimitHint(snapshot),
          };
        },
      ),
    );

  const handleRenameGroup = (from: string, to: string) =>
    commit(
      (latest) => renameShellGroup(latest, from, to),
      (_updated, snapshot) => ({
        title: t("st.groupRenamedToast", { from, to }),
        message: snapshotLimitHint(snapshot),
      }),
    );

  const handleDissolveGroup = async (group: string) => {
    const count = config.snippets.filter((s) => s.group === group).length;
    const confirmed = await confirmDestructive({
      title: t("grp.dissolveTitle", { group }),
      message: t("grp.dissolveMessage", { count }),
      actionTitle: t("grp.dissolveConfirm"),
    });
    if (!confirmed) return;
    await run(() =>
      commit(
        (latest) => renameShellGroup(latest, group, undefined),
        (_updated, snapshot) => ({
          title: t("st.groupDissolvedToast", { group }),
          message: snapshotLimitHint(snapshot),
        }),
      ),
    );
  };

  // 调整片段在 shell.sh 里的先后。列表是按分组显示的,分组顺序跟文件里的真实顺序对不上,
  // 所以移动后用 toast 报一下新位置,再配合"查看生成的 shell.sh"让用户能核对
  const handleMove = (id: string, direction: "up" | "down") =>
    run(() =>
      commit(
        // 已经在最前/最后时 moveShellSnippet 原样返回,commit 里会识别出"没变"不写盘
        (latest) => moveShellSnippet(latest, id, direction),
        (updated) => {
          const index = updated.snippets.findIndex((s) => s.id === id) + 1;
          return { title: t("st.movedToast", { index, total: updated.snippets.length }) };
        },
      ),
    );

  const handleDelete = async (item: ShellSnippet) => {
    const confirmed = await confirmDestructive({
      title: t("st.deleteConfirmTitle", { name: item.name }),
      message: t("st.deleteConfirmMessage"),
      actionTitle: t("common.delete"),
    });
    if (!confirmed) return;

    await run(() =>
      commit(
        (latest) => removeShellSnippet(latest, item.id),
        (_updated, snapshot) => ({ title: t("st.deletedToast"), message: snapshotLimitHint(snapshot) }),
      ),
    );
  };

  // 写进 rc 的那一行带存在性保护、用 $HOME;刷新命令只是 source
  const sourceLine = getShellSourceLine();
  const refreshCommand = getShellRefreshCommand();
  // 只在明确探测到 zsh/bash 时才做语法校验;识别不出来(如 fish)就传 undefined,EditShellSnippetForm 会自动跳过校验
  const shellKind: ValidatableShell | undefined =
    rcInfo && rcInfo.shellName !== "unknown" ? rcInfo.shellName : undefined;
  const conflicts = findShellConflicts(config.snippets);
  const groups = listShellGroups(config);
  const buckets = groupShellSnippets(config.snippets);
  // rc 里没有 source 那一行时,片段再"已启用"也不会进任何终端;界面不能照旧显示绿色"已生效"
  const integrationActive = rcInfo?.isSourced ?? true;

  // 每个分区渲染的是同一种条目,props 也完全一样,抽出来避免抄几遍
  const renderSnippet = (item: ShellSnippet) => (
    <SnippetListItem
      key={item.id}
      item={item}
      orderIndex={config.snippets.findIndex((s) => s.id === item.id) + 1}
      orderTotal={config.snippets.length}
      canMoveUp={adjacentInGroupIndex(config.snippets, item.id, "up") >= 0}
      canMoveDown={adjacentInGroupIndex(config.snippets, item.id, "down") >= 0}
      conflicts={conflicts.filter((c) => c.snippets.some((x) => x.id === item.id))}
      groupMates={item.group ? config.snippets.filter((s) => s.group === item.group) : []}
      existingGroups={groups}
      onSetGroupEnabled={handleSetGroupEnabled}
      onRenameGroup={handleRenameGroup}
      onDissolveGroup={handleDissolveGroup}
      shellKind={shellKind}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onMove={handleMove}
      revealSecrets={revealSecrets}
      onToggleReveal={() => setRevealSecrets((v) => !v)}
      currentConfig={config}
      onRestored={refreshConfig}
      refreshCommand={refreshCommand}
      integrationActive={integrationActive}
    />
  );

  // 首次引导条:探测到已经 source 过就显示"已就绪",没探测到 shell 类型(如 fish)就给保守的手动提示
  const bootstrapTitle = !rcInfo
    ? ""
    : rcInfo.isSourced
      ? t("st.bootstrapReadyTitle")
      : rcInfo.shellName === "unknown"
        ? t("st.bootstrapUnknownTitle")
        : t("st.bootstrapPendingTitle", { file: rcInfo.rcLabel });
  // 登录 shell 不是 zsh / bash(如 fish):生成的脚本是 bash 语法,在里面用不了;rc 路径的兜底值也跟他无关。
  // 说实话、把指着 rc 文件的动作都藏起来,别让人对着一个错误的文件折腾
  const unsupportedShell = rcInfo?.shellName === "unknown";
  const bootstrapSubtitle = !rcInfo
    ? ""
    : unsupportedShell
      ? t("st.unsupportedShellSubtitle", { shell: rcInfo.loginShell || "?" })
      : rcInfo.isSourced
        ? t("st.bootstrapReadySubtitle", { file: rcInfo.rcLabel })
        : sourceLine;
  const bootstrapMarkdown = !rcInfo
    ? ""
    : unsupportedShell
      ? t("st.unsupportedShellDetail", { shell: rcInfo.loginShell || "?" })
      : t("st.bootstrapDetailMarkdown", { sourceLine, refreshCommand, file: rcInfo.rcLabel, rcPath: rcInfo.rcLabel });

  // 有片段时才开详情预览面板(没有片段就没什么可预览的,保持紧凑列表更合适)
  const isShowingDetail = config.snippets.length > 0;

  return (
    <List
      isLoading={loading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={t("st.searchPlaceholder")}
      searchBarAccessory={searchBarAccessory}
      {...(initialSelectedId
        ? { selectedItemId, onSelectionChange: (id: string | null) => setSelectedItemId(id ?? undefined) }
        : {})}
    >
      {configProblem && (
        <List.Section title={t("cfg.sectionTitle")}>
          <ConfigProblemItem problem={configProblem} />
        </List.Section>
      )}

      {rcInfo && (
        <List.Section title={t("st.bootstrapSection")}>
          <List.Item
            id="bootstrap"
            // 有片段却没接入:这时片段全都不生效,顶上这一行要醒目
            icon={{
              source: rcInfo.isSourced
                ? Icon.CheckCircle
                : config.snippets.length > 0 || unsupportedShell
                  ? Icon.ExclamationMark
                  : Icon.Terminal,
              tintColor: rcInfo.isSourced
                ? Color.Green
                : config.snippets.length > 0 || unsupportedShell
                  ? Color.Orange
                  : Color.Blue,
            }}
            title={bootstrapTitle}
            subtitle={isShowingDetail ? undefined : bootstrapSubtitle}
            // 没有片段时的引导放在这一行右侧:空状态页面在这里永远显示不出来(这一行始终在),之前那段引导是死的
            accessories={config.snippets.length === 0 && !loading ? [{ text: t("st.noSnippetsHint") }] : undefined}
            detail={isShowingDetail ? <List.Item.Detail markdown={bootstrapMarkdown} /> : undefined}
            actions={
              <ActionPanel>
                {/* 回车永远是无害动作:没接入时是"启用",接入后是"复制刷新命令";"禁用"是破坏性的,沉到最底 */}
                {!rcInfo.isSourced && rcInfo.shellName !== "unknown" && (
                  <Action
                    title={t("st.actionEnableIntegration", { file: rcInfo.rcLabel })}
                    icon={Icon.Bolt}
                    onAction={() => handleEnableIntegration(rcInfo, sourceLine)}
                  />
                )}
                {/* 同一行命令,两种身份:没启用时是"要加进 rc 的那一行",启用后是"已开终端的刷新命令" */}
                {rcInfo.isSourced ? (
                  <Action
                    title={t("st.actionCopyRefresh")}
                    icon={Icon.Clipboard}
                    onAction={() => copyRefreshCommand(refreshCommand)}
                  />
                ) : unsupportedShell ? null : (
                  <Action.CopyToClipboard
                    title={t("st.copySourceCommand")}
                    icon={Icon.Clipboard}
                    content={sourceLine}
                  />
                )}
                <Action.Push
                  title={t("st.actionNewSnippet")}
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<EditShellSnippetForm shellKind={shellKind} existingGroups={groups} onSave={handleAdd} />}
                />
                {!unsupportedShell && (
                  <Action.Push
                    title={t("st.actionRcBackups", { file: rcInfo.rcLabel })}
                    icon={Icon.Folder}
                    target={<ShellRcBackupsView rcInfo={rcInfo} />}
                  />
                )}
                <Action.Push
                  title={t("st.actionPreviewScript")}
                  icon={Icon.Document}
                  target={<ShellScriptPreview snippets={config.snippets} />}
                />
                <Action.Push
                  title={t("st.actionConfigHistory")}
                  icon={Icon.Rewind}
                  target={<ShellConfigHistoryView currentConfig={config} onRestored={refreshConfig} />}
                />
                <Action.ShowInFinder title={t("common.showDataDir")} path={getBaseDir()} />
                {!isShowingDetail && (
                  <Action.Push
                    title={t("st.bootstrapLearnMore")}
                    icon={Icon.Info}
                    target={<Detail markdown={bootstrapMarkdown} navigationTitle={t("st.bootstrapSection")} />}
                  />
                )}
                {rcInfo.isSourced && (
                  <ActionPanel.Section>
                    <Action
                      title={t("st.actionDisableIntegration", { file: rcInfo.rcLabel })}
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => handleDisableIntegration(rcInfo, sourceLine)}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* 按分组分区(组的先后 = 组内第一条的生成位置,未分组最后);一个分组都没有时平铺、不摆标题。
          类型不再占分区——它退成每行一个小图标,搜索时也能按类型名筛 */}
      {buckets.map((bucket) => (
        <List.Section
          key={bucket.group ?? "__ungrouped__"}
          // 没分组时也要有标题:上面永远有"Shell 集成"分区,没标题的区块会被读成它的延续
          title={
            groups.length === 0
              ? t("st.sectionSnippets")
              : bucket.group
                ? t("grp.section", { group: bucket.group })
                : t("grp.ungrouped")
          }
          subtitle={t("pd.countItems", { count: bucket.snippets.length })}
        >
          {bucket.snippets.map(renderSnippet)}
        </List.Section>
      ))}
    </List>
  );
}

// 搜索时按类型筛的词;要跟 st.searchPlaceholder 里写的一致
function snippetTypeKeywords(type: ShellSnippet["type"]): string[] {
  if (type === "export") return ["export", "变量"];
  if (type === "alias") return ["alias", "别名"];
  return ["snippet", "脚本"];
}

// 类型退成一个小图标:开着详情面板时列表很窄,放不下文字
function snippetTypeIcon(type: ShellSnippet["type"]): Icon {
  if (type === "export") return Icon.Text;
  // alias = 别名 = 给命令贴个名字,用标签;链接图标会被读成"网址"
  if (type === "alias") return Icon.Tag;
  return Icon.Code;
}

// 片段类型对应的展示文案(复用编辑表单下拉框已有的翻译,避免再造一套)
function snippetTypeLabel(type: ShellSnippet["type"]): string {
  if (type === "export") return t("es.typeExport");
  if (type === "alias") return t("es.typeAlias");
  return t("es.typeSnippet");
}

// 生成文件的预览页:列表按类型分组,看不出真实先后,这里把 shell.sh 摊开
function ShellScriptPreview({ snippets }: { snippets: ShellSnippet[] }) {
  const [content, setContent] = useState<string | null>(null);
  // 预览页展示的是完整的 shell.sh,里面同样可能有密钥,默认打码
  const [reveal, setReveal] = useState(false);
  const scriptPath = getShellScriptPath();

  useEffect(() => {
    // 读不出来也要把加载态收掉(content 设成空串),否则这个页面会一直转圈
    readShellScript()
      .then(setContent)
      .catch(async (e) => {
        setContent("");
        await showFailureToast(t("st.loadFailedTitle"), e);
      });
  }, []);

  // 按片段分别打码,用的是生成逻辑本身(不是"读文件再统一打码"):
  // 前者才认得出哪个片段被勾了"整段敏感"——此前整份预览统一打码,那个勾在这里等于没生效
  const visibleScript = generateShellScript(snippets, {
    transformContent: (snippet, text) => (reveal ? text : maskShellContent(text, { maskAll: snippet.containsSecret })),
  });
  // 磁盘上的文件跟"拿现在这份配置生成出来的"不一样:上次写盘没成功,或者有人手改过。如实说。
  // 比对必须用没打码的那份——拿打码后的预览去比,只要有一个片段含密钥就永远"不一致"
  const stale = content !== null && content.trim() !== "" && content !== generateShellScript(snippets);

  let markdown = "";
  if (content !== null) {
    markdown = [
      t("st.previewIntro"),
      "",
      `**${t("st.previewPathLabel")}**: \`${scriptPath}\``,
      ...(stale ? ["", t("st.previewStale")] : []),
      "",
      "---",
      "",
      "```bash",
      visibleScript,
      "```",
    ].join("\n");
  }

  return (
    <Detail
      isLoading={content === null}
      navigationTitle={t("st.previewTitle")}
      markdown={markdown}
      actions={
        content !== null ? (
          <ActionPanel>
            <Action
              title={reveal ? t("st.actionHideSecrets") : t("st.actionRevealSecrets")}
              icon={reveal ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setReveal((v) => !v)}
            />
            <Action.CopyToClipboard title={t("st.previewCopy")} content={visibleScript} concealed />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// 详情面板内容:元信息(类型/状态/排列顺序/备注) + 完整代码,不用再进编辑表单才能看全
function buildSnippetDetailMarkdown(
  item: ShellSnippet,
  orderIndex: number,
  orderTotal: number,
  revealSecrets: boolean,
  conflicts: ShellConflict[],
  integrationActive: boolean,
): string {
  const statusLabel = !item.enabled
    ? t("st.disabledTag")
    : integrationActive
      ? t("st.enabledTag")
      : t("st.enabledInactiveTag");
  const descriptionLabel = item.description || t("st.detailNone");
  const conflictBlock =
    conflicts.length > 0
      ? `\n\n**${t("st.detailConflicts")}**:\n\n${conflicts.map((c) => describeConflict(c, item.id)).join("\n\n")}`
      : "";

  // 用纯文本行而不是 markdown 列表:列表符号会被 Raycast 渲染成主题色圆点,
  // 红色在界面里通常意味着错误,而这里只是普通信息,容易误导
  // 标题就用片段名:左边列表窄,名字常被截断,这里是唯一能看全的地方
  return `### ${item.name}

**${t("st.detailType")}**: ${snippetTypeLabel(item.type)}

**${t("st.detailStatus")}**: ${statusLabel}

**${t("st.detailGroup")}**: ${item.group ?? t("grp.ungrouped")}

**${t("st.detailOrder")}**: ${t("st.detailOrderValue", { index: orderIndex, total: orderTotal })}

**${t("st.detailDescription")}**: ${descriptionLabel}${conflictBlock}

---

\`\`\`bash
${revealSecrets ? item.content : maskShellContent(item.content, { maskAll: item.containsSecret })}
\`\`\``;
}

function SnippetListItem({
  item,
  orderIndex,
  orderTotal,
  conflicts,
  groupMates,
  existingGroups,
  onSetGroupEnabled,
  onRenameGroup,
  onDissolveGroup,
  shellKind,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onMove,
  revealSecrets,
  onToggleReveal,
  currentConfig,
  onRestored,
  refreshCommand,
  integrationActive,
  canMoveUp,
  canMoveDown,
}: {
  item: ShellSnippet;
  /** 该片段在 shell.sh 生成顺序里的位置,从 1 开始 */
  orderIndex: number;
  orderTotal: number;
  /** 同组里还有没有前一条 / 后一条可以换位 */
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** 这一段卷入的"重复设置"(跟别的已启用片段设了同一个变量 / alias) */
  conflicts: ShellConflict[];
  /** 同组的全部片段(含自己);没分组时为空 */
  groupMates: ShellSnippet[];
  existingGroups: string[];
  onSetGroupEnabled: (group: string, enabled: boolean) => void;
  onRenameGroup: (from: string, to: string) => Promise<void>;
  onDissolveGroup: (group: string) => void;
  shellKind: ValidatableShell | undefined;
  onToggle: (id: string) => void;
  onEdit: (id: string, data: Omit<ShellSnippet, "id">) => Promise<void>;
  onDelete: (item: ShellSnippet) => void;
  onAdd: (data: Omit<ShellSnippet, "id">) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => void;
  revealSecrets: boolean;
  onToggleReveal: () => void;
  currentConfig: ShellConfig;
  onRestored: () => void;
  /** `source ~/.env-keeper/shell.sh`,粘进已开的终端就能拿到新增和修改 */
  refreshCommand: string;
  /** rc 文件里有没有 source 那一行;没有的话"已启用"的片段其实进不了任何终端 */
  integrationActive: boolean;
}) {
  const group = item.group;
  const someEnabled = groupMates.some((s) => s.enabled);
  const someDisabled = groupMates.some((s) => !s.enabled);

  return (
    <List.Item
      id={item.id}
      title={item.name}
      // 组名和类型进搜索关键词:搜索栏的下拉位置被"项目轨 / Shell 轨"占了,筛选靠打字。
      // 类型用固定短词(中英各一),搜索框占位文字里把这几个词写明,用户不用猜
      keywords={[...snippetTypeKeywords(item.type), ...(group ? [group] : [])]}
      // 状态放左侧图标位:所有行的图标在同一条竖线上,一列扫下来最快;
      // 右侧只留顺序号,避免开着详情面板时把列表挤得太窄
      icon={
        !item.enabled
          ? { source: Icon.Pause, tintColor: Color.SecondaryText }
          : integrationActive
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.CheckCircle, tintColor: Color.SecondaryText }
      }
      accessories={[
        { icon: snippetTypeIcon(item.type), tooltip: snippetTypeLabel(item.type) },
        ...(item.containsSecret
          ? [{ icon: { source: Icon.Lock, tintColor: Color.Orange }, tooltip: t("st.secretTag") }]
          : []),
        // 跟"含敏感信息"同一种写法:只放橙色小图标,文字进悬停提示和详情面板。
        // 开着详情面板时列表很窄,这一排多几个字就把顺序号挤没了
        ...(conflicts.length > 0
          ? [
              {
                icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
                tooltip: conflicts.map((c) => describeConflict(c, item.id)).join("\n"),
              },
            ]
          : []),
        // 带 # 前缀,免得裸数字被误读成"几项"(分组标题上已经在用裸数字表示数量)
        { tag: { value: `#${orderIndex}`, color: Color.SecondaryText }, tooltip: t("st.orderTooltip") },
      ]}
      detail={
        <List.Item.Detail
          markdown={buildSnippetDetailMarkdown(
            item,
            orderIndex,
            orderTotal,
            revealSecrets,
            conflicts,
            integrationActive,
          )}
        />
      }
      actions={
        <ActionPanel>
          {/* 回车 = 启停(⌘T,跟项目轨对齐);显示明文统一 ⌘⇧M */}
          <ActionPanel.Section>
            <Action
              title={item.enabled ? t("st.actionDisable") : t("st.actionEnable")}
              icon={item.enabled ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => onToggle(item.id)}
            />
            <Action.Push
              title={t("st.actionEdit")}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EditShellSnippetForm
                  initialData={item}
                  shellKind={shellKind}
                  existingGroups={existingGroups}
                  onSave={(data) => onEdit(item.id, data)}
                />
              }
            />
            <Action.Push
              title={t("st.actionNew")}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<EditShellSnippetForm shellKind={shellKind} existingGroups={existingGroups} onSave={onAdd} />}
            />
            {/* 只跟同组的邻居换位:跟数组邻居换的话片段会从眼前的分区消失 */}
            {canMoveUp && (
              <Action
                title={t("st.actionMoveUp")}
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => onMove(item.id, "up")}
              />
            )}
            {canMoveDown && (
              <Action
                title={t("st.actionMoveDown")}
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => onMove(item.id, "down")}
              />
            )}
            <Action
              title={revealSecrets ? t("st.actionHideSecrets") : t("st.actionRevealSecrets")}
              icon={revealSecrets ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={onToggleReveal}
            />
          </ActionPanel.Section>
          {/* 分组只是散落在每条片段上的字段,区块标题挂不了动作,所以从组里任意一条进 */}
          {group && (
            <ActionPanel.Section title={t("grp.section", { group })}>
              {someDisabled && (
                <Action
                  title={t("st.actionEnableGroup", { group })}
                  icon={Icon.Play}
                  onAction={() => onSetGroupEnabled(group, true)}
                />
              )}
              {someEnabled && (
                <Action
                  title={t("st.actionDisableGroup", { group })}
                  icon={Icon.Pause}
                  onAction={() => onSetGroupEnabled(group, false)}
                />
              )}
              <Action.Push
                title={t("grp.actionRename", { group })}
                icon={Icon.Pencil}
                target={
                  <RenameGroupForm
                    group={group}
                    count={groupMates.length}
                    otherGroups={existingGroups.filter((g) => g !== group)}
                    onRename={(to) => onRenameGroup(group, to)}
                  />
                }
              />
              <Action
                title={t("grp.actionDissolve", { group })}
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                onAction={() => onDissolveGroup(group)}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title={t("st.sectionHistoryPreview")}>
            <Action.Push
              title={t("st.actionSnippetHistory")}
              icon={Icon.Clock}
              target={
                <ShellConfigHistoryView
                  currentConfig={currentConfig}
                  onRestored={onRestored}
                  focusSnippet={{ id: item.id, name: item.name }}
                />
              }
            />
            <Action.Push
              title={t("st.actionConfigHistory")}
              icon={Icon.Rewind}
              target={<ShellConfigHistoryView currentConfig={currentConfig} onRestored={onRestored} />}
            />
            <Action.Push
              title={t("st.actionPreviewScript")}
              icon={Icon.Document}
              target={<ShellScriptPreview snippets={currentConfig.snippets} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={t("st.sectionCopy")}>
            <Action.CopyToClipboard title={t("st.actionCopyContent")} content={item.content} concealed />
            <Action
              title={t("st.actionCopyRefresh")}
              icon={Icon.Clipboard}
              onAction={() => copyRefreshCommand(refreshCommand)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("st.actionDelete")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => onDelete(item)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
