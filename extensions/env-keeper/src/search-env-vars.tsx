import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { join } from "node:path";
import { useEffect, useState } from "react";
import {
  type EnvQuote,
  extractShellAssignments,
  findShellConflicts,
  formatKVRaw,
  isEncryptedValue,
  isSecretKey,
  maskSecret,
  parseEnv,
  type ProjectMeta,
} from "@env-keeper/core";
import { t } from "./i18n.js";
import { showFailureToast } from "./views/failureToast.js";
import { detectProjectEnvFiles, loadPresets, loadRegistry, loadShellConfig, readEnvFile } from "./services/storage.js";
import { ProjectDetailView } from "./views/ProjectDetailView.js";
import { ShellTrackView } from "./views/ShellTrackView.js";

interface MatchedVariable {
  key: string;
  value: string;
  disabled: boolean;
  /** 复制整行时要照着原样拼:项目轨有引号形态、行内注释和 export 前缀,Shell 轨没有 */
  quote?: EnvQuote | null;
  comment?: string;
  exportPrefix?: boolean;
  /** 展示用的来源:项目名 或 Shell 轨的片段名 */
  sourceLabel: string;
  /** 项目轨才有;Shell 轨的变量没有对应文件 */
  project?: ProjectMeta;
  envFilePath?: string;
  /** 项目轨:变量所在的环境文件名,跳过去时要停在这个文件上而不是默认的 .env */
  envFilename?: string;
  /** Shell 轨:变量所在片段的 id,跳过去时直接选中它 */
  snippetId?: string;
  /** Shell 轨:同一个变量还在别的已启用片段里设了,而且最终以那份为准——这一行的值其实没生效 */
  overriddenBy?: string;
  /** 项目轨的方案:这是"候选值"不是"生效值"。方案没有文件,跳过去落在项目页 */
  presetName?: string;
}

export default function Command() {
  const [allVars, setAllVars] = useState<MatchedVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadAllVars() {
      setLoading(true);
      try {
        // 项目和文件都并行扫。原先是嵌套 for + await 串行,
        // 10 个项目 × 3 个文件就是 30 次排队等待的磁盘往返
        const [{ data: reg }, shell, presets] = await Promise.all([loadRegistry(), loadShellConfig(), loadPresets()]);

        const perProject = await Promise.all(
          reg.projects.map(async (project) => {
            const files = await detectProjectEnvFiles(project.path);
            const perFile = await Promise.all(
              files.map(async (f) => {
                const fullPath = join(project.path, f);
                try {
                  // 搜索只读内容,不需要冲突检测用的指纹,省掉每个文件一次哈希
                  const { content, exists } = await readEnvFile(fullPath, { withFingerprint: false });
                  if (!exists) return [];
                  return parseEnv(content)
                    .filter((l): l is Extract<typeof l, { type: "kv" }> => l.type === "kv")
                    .map<MatchedVariable>((l) => ({
                      key: l.key,
                      value: l.value,
                      disabled: l.disabled,
                      quote: l.quote,
                      comment: l.comment,
                      exportPrefix: l.exportPrefix,
                      sourceLabel: `${project.name} / ${f}`,
                      project,
                      envFilePath: fullPath,
                      envFilename: f,
                    }));
                } catch {
                  // 单个文件读不了就跳过,不影响其余结果
                  return [];
                }
              }),
            );
            return perFile.flat();
          }),
        );

        // Shell 轨里存的同样是环境变量,搜 JAVA_HOME 却搜不到会被当成 bug。
        // 搜索也是用户最容易发现"这个变量设了两处"的地方,所以把被覆盖的那条标出来
        const conflicts = findShellConflicts(shell.data.snippets);
        const shellVars = shell.data.snippets.flatMap((snippet) =>
          extractShellAssignments(snippet.content).map<MatchedVariable>((a) => {
            const conflict = conflicts.find(
              (c) => c.kind === "variable" && c.name === a.key && c.snippets.some((x) => x.id === snippet.id),
            );
            const winner =
              conflict && conflict.effectiveId !== snippet.id
                ? conflict.snippets.find((x) => x.id === conflict.effectiveId)
                : undefined;
            return {
              key: a.key,
              value: a.value,
              disabled: !snippet.enabled,
              sourceLabel: snippet.group
                ? t("search.shellSourceGrouped", { group: snippet.group, name: snippet.name })
                : t("search.shellSource", { name: snippet.name }),
              snippetId: snippet.id,
              overriddenBy: winner?.name,
            };
          }),
        );

        // 方案是变量值的正经存放处("客户老王的 API_KEY 是多少"答案在这),搜不到同样会被当成 bug。
        // 但它是候选值不是生效值,单独一个分区、排最后
        const projectById = new Map(reg.projects.map((p) => [p.id, p]));
        const presetVars = presets.data.presets.flatMap((preset) => {
          const project = projectById.get(preset.projectId);
          if (!project) return [];
          return parseEnv(preset.content)
            .filter((l): l is Extract<typeof l, { type: "kv" }> => l.type === "kv")
            .map<MatchedVariable>((l) => ({
              key: l.key,
              value: l.value,
              disabled: l.disabled,
              quote: l.quote,
              comment: l.comment,
              exportPrefix: l.exportPrefix,
              sourceLabel: t("search.presetSource", { project: project.name, name: preset.name }),
              project,
              presetName: preset.name,
            }));
        });

        setAllVars([...perProject.flat(), ...shellVars, ...presetVars]);
      } catch (e) {
        await showFailureToast(t("search.loadFailedTitle"), e);
      } finally {
        setLoading(false);
      }
    }
    loadAllVars();
  }, []);

  const toggleReveal = (id: string) => {
    setRevealedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = allVars.filter((v) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      v.key.toLowerCase().includes(q) ||
      v.sourceLabel.toLowerCase().includes(q) ||
      // 敏感值不参与按值搜索:否则在搜索框里逐字试探就能反推出密钥
      (!isSecretKey(v.key, v.project?.customSecrets, v.value) && v.value.toLowerCase().includes(q))
    );
  });
  const projectVars = filtered.filter((v) => v.project && !v.presetName);
  const shellVars = filtered.filter((v) => !v.project);
  const presetVars = filtered.filter((v) => v.presetName);

  const renderSection = (title: string, items: MatchedVariable[]) => {
    if (items.length === 0) return null;
    return (
      <List.Section title={title} subtitle={t("search.sectionSubtitle", { count: items.length })}>
        {items.map((item, idx) => {
          const uniqueId = `${item.project?.id ?? "shell"}_${item.sourceLabel}_${item.key}_${idx}`;
          const isSecret = isSecretKey(item.key, item.project?.customSecrets, item.value);
          const isEncrypted = isEncryptedValue(item.value);
          const isRevealed = revealedSet.has(uniqueId);
          const bare = (isSecret || isEncrypted) && !isRevealed ? maskSecret(item.value) : item.value;
          // 跟项目页一致:有引号就照文件里的样子带引号显示
          const displayVal = item.quote ? `${item.quote}${bare}${item.quote}` : bare;

          return (
            <List.Item
              key={uniqueId}
              title={item.key}
              subtitle={displayVal}
              accessories={[
                { text: item.sourceLabel },
                ...(isEncrypted ? [{ tag: { value: t("pd.encryptedTag"), color: Color.Purple } }] : []),
                ...(isSecret
                  ? [{ icon: { source: Icon.Lock, tintColor: Color.Orange }, tooltip: t("search.lockTooltip") }]
                  : []),
                ...(item.disabled ? [{ tag: { value: t("pd.disabledTag"), color: Color.SecondaryText } }] : []),
                ...(item.overriddenBy
                  ? [
                      {
                        tag: {
                          value: t("search.overriddenTag", { name: item.overriddenBy }),
                          color: Color.SecondaryText,
                        },
                        tooltip: t("search.overriddenTooltip", { name: item.overriddenBy }),
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  {/* 跳过去要落在搜到的那一项上:带上环境文件名和变量名,否则搜到
                      .env.prod 里的变量、跳过去看到的却是 .env 的列表顶端 */}
                  {item.project ? (
                    <Action.Push
                      title={t("search.actionGoto")}
                      icon={Icon.ArrowRight}
                      target={
                        <ProjectDetailView
                          project={item.project}
                          initialEnvFile={item.envFilename}
                          initialSelectedKey={item.key}
                        />
                      }
                    />
                  ) : (
                    <Action.Push
                      title={t("search.actionGotoShell")}
                      icon={Icon.Terminal}
                      target={<ShellTrackView initialSelectedId={item.snippetId} />}
                    />
                  )}
                  {(isSecret || isEncrypted) && (
                    <Action
                      title={isRevealed ? t("search.actionHide") : t("search.actionReveal")}
                      icon={isRevealed ? Icon.EyeDisabled : Icon.Eye}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                      onAction={() => toggleReveal(uniqueId)}
                    />
                  )}
                  <Action.CopyToClipboard title={t("search.actionCopyValue")} content={item.value} concealed />
                  <Action.CopyToClipboard title={t("search.actionCopyKey")} content={item.key} />
                  <Action.CopyToClipboard
                    title={t("pd.actionCopyPair")}
                    content={formatKVRaw(item.key, item.value, {
                      quote: item.quote ?? null,
                      comment: item.comment,
                      exportPrefix: item.exportPrefix,
                      // 项目轨的"禁用"就是注释掉那一行,照原样带上 #;
                      // Shell 轨的"禁用"是整个片段不生成,行本身并没有被注释
                      disabled: Boolean(item.project) && item.disabled,
                      end: "",
                    })}
                    concealed
                  />
                  {item.envFilePath && <Action.OpenWith title={t("mv.actionOpenWith")} path={item.envFilePath} />}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    );
  };

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t("search.placeholder")}
    >
      {renderSection(t("search.sectionTitle"), projectVars)}
      {renderSection(t("search.sectionShell"), shellVars)}
      {renderSection(t("search.sectionPresets"), presetVars)}

      {filtered.length === 0 && !loading && (
        <List.EmptyView title={t("search.emptyTitle")} description={t("search.emptyDesc")} />
      )}
    </List>
  );
}
