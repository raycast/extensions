import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import {
  type EnvLine,
  parseEnv,
  serializeEnv,
  addEnvVariable,
  countEnvKeys,
  findEnvLineIndex,
  removeEnvVariableAt,
  toggleEnvVariableAt,
  updateEnvVariableAt,
  mergeExampleEnv,
  generateExampleEnv,
  isSecretKey,
  formatKVRaw,
  isEncryptedValue,
  maskSecret,
  type ProjectMeta,
  renameProjectSecret,
  setEnvrcNoticeDismissed,
  toggleProjectSecret,
  type Preset,
  type PresetsFile,
  addPreset,
  clearPresetApplied,
  createEmptyPresetsFile,
  detectPresetDrift,
  groupPresets,
  listPresetGroups,
  listPresetsForProject,
  recordPresetApplied,
  updatePreset,
} from "@env-keeper/core";
import { snapshotLimitHint, t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { showFailureToast } from "./failureToast.js";
import {
  type ConfigLoadProblem,
  checkEnvrcExists,
  detectProjectEnvFiles,
  loadPresets,
  loadRegistry,
  readEnvFile,
  savePresets,
  saveRegistry,
  writeEnvFileWithSnapshot,
} from "../services/storage.js";
import { ConfigProblemItem } from "./ConfigProblemItem.js";
import { CreateEnvFileForm } from "./CreateEnvFileForm.js";
import { EditVariableForm, type VariableFormData } from "./EditVariableForm.js";
import { PresetDiffView } from "./PresetDiffView.js";
import { PresetMetaForm, type PresetMetaData } from "./PresetMetaForm.js";
import { PresetsView } from "./PresetsView.js";
import { applyPresetToFile } from "../services/presetApply.js";
import { RawContentForm } from "./RawContentForm.js";
import { SnapshotHistoryView } from "./SnapshotHistoryView.js";

interface ProjectDetailViewProps {
  project: ProjectMeta;
  onProjectUpdated?: (project: ProjectMeta) => void;
  /** 从全局搜索跳过来时,直接停在搜到的那个环境文件上,而不是默认的 .env */
  initialEnvFile?: string;
  /** 从全局搜索跳过来时,直接选中搜到的那个变量 */
  initialSelectedKey?: string;
}

/**
 * 下拉框里"新建环境文件"那一项的哨兵值。
 * Raycast 的 List.Dropdown 是"选中即触发",没有单独的按钮位,
 * 所以只能放一个假选项:选中它时不更新当前值(受控值会自己弹回去),直接把表单推上来。
 * 放在这里是因为"我要换个环境"和"我要建一个环境"本来就是同一个语境,
 * 藏在 ⌘K 里太隐蔽了。
 */
const CREATE_ENV_FILE_VALUE = "__env_butler_create_env_file__";

/** 列表项的标识按"第几行"而不是变量名:同一个 key 写两行是常见写法,按名字会撞 */
const lineItemId = (index: number) => `line_${index}`;

export function ProjectDetailView({
  project,
  onProjectUpdated,
  initialEnvFile,
  initialSelectedKey,
}: ProjectDetailViewProps) {
  const { push } = useNavigation();
  const [currentProject, setCurrentProject] = useState<ProjectMeta>(project);
  const [envFiles, setEnvFiles] = useState<string[]>([]);
  const [selectedEnvFile, setSelectedEnvFile] = useState<string>(initialEnvFile ?? ".env");
  // 只有从全局搜索跳过来时才接管选中项;平时交给 Raycast 自己管,免得跟它的选中逻辑打架。
  // 列表项按"第几行"标识(同名两行时按名字会撞),所以要等文件读出来才知道该选哪一项
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const initialSelectionApplied = useRef(false);
  const [lines, setLines] = useState<EnvLine[]>([]);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hasEnvrc, setHasEnvrc] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [presetsFile, setPresetsFile] = useState<PresetsFile>(createEmptyPresetsFile());
  const [presetsProblem, setPresetsProblem] = useState<ConfigLoadProblem | undefined>();

  const currentEnvFilePath = join(currentProject.path, selectedEnvFile);

  const loadPresetsState = async () => {
    const result = await loadPresets();
    setPresetsFile(result.data);
    setPresetsProblem(result.problem);
  };

  // 初始化探测环境文件与 .envrc(若用户已针对本项目关闭提示,则即使检测到也不再展示)
  const refreshEnvFiles = async () => {
    const files = await detectProjectEnvFiles(currentProject.path);
    setEnvFiles(files);
    // 用函数式更新:这里被 effect 和好几个动作调用,直接读 selectedEnvFile 读到的是闭包里的旧值,
    // 刚新建/切换过的文件会被它判成"不在列表里"又弹回第一个
    setSelectedEnvFile((prev) => (files.includes(prev) ? prev : (files[0] ?? ".env")));
    const envrc = (await checkEnvrcExists(currentProject.path)) && !currentProject.dismissedEnvrcNotice;
    setHasEnvrc(envrc);
  };

  /**
   * 读取当前选中的环境文件。
   * `isStale` 给 effect 用:切文件切得快时,先发的那次读可能后回来,把新文件的内容盖掉,
   * 而指纹跟着错位之后,下一次保存会误报或漏报"文件被外部改过"
   */
  const loadCurrentEnvContent = async (isStale: () => boolean = () => false) => {
    setLoading(true);
    try {
      const { content, fingerprint } = await readEnvFile(currentEnvFilePath);
      if (isStale()) return;
      setLines(parseEnv(content));
      setCurrentFingerprint(fingerprint);
    } catch (e) {
      if (isStale()) return;
      await showFailureToast(t("pd.readFailedTitle"), e);
    } finally {
      // 过期的那次不碰加载态:它已经不负责这个页面了
      if (!isStale()) setLoading(false);
    }
  };

  useEffect(() => {
    refreshEnvFiles();
    loadPresetsState();
  }, [currentProject.path]);

  useEffect(() => {
    if (!selectedEnvFile) return;
    let cancelled = false;
    loadCurrentEnvContent(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [selectedEnvFile, currentProject.path]);

  useEffect(() => {
    if (loading || !initialSelectedKey || initialSelectionApplied.current) return;
    initialSelectionApplied.current = true;
    const index = findEnvLineIndex(lines, initialSelectedKey);
    if (index >= 0) setSelectedItemId(lineItemId(index));
  }, [loading]);

  // 安全保存并打快照
  const saveLines = async (newLines: EnvLine[], force = false): Promise<boolean> => {
    const serialized = serializeEnv(newLines);
    const result = await writeEnvFileWithSnapshot({
      project: currentProject,
      envFilePath: currentEnvFilePath,
      newContent: serialized,
      expectedFingerprint: currentFingerprint,
      force,
    });

    if (result.conflict) {
      const confirmed = await confirmAlert({
        title: t("pd.conflictTitle"),
        message: t("pd.conflictMessage", { file: selectedEnvFile }),
        primaryAction: {
          title: t("pd.conflictOverwrite"),
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: t("pd.conflictDiscardMine"),
        },
      });

      if (confirmed) {
        return saveLines(newLines, true);
      } else {
        await loadCurrentEnvContent();
        return false;
      }
    }

    if (result.success && result.newFingerprint) {
      setLines(newLines);
      setCurrentFingerprint(result.newFingerprint);
      await showToast({
        style: Toast.Style.Success,
        title: t("pd.savedToast"),
        message: snapshotLimitHint(result),
      });
      return true;
    }

    return false;
  };

  // 关闭该项目的 .envrc 提示(写入 registry,仅影响本项目)
  const handleDismissEnvrc = async () => {
    const { data: registry } = await loadRegistry();
    const updated = setEnvrcNoticeDismissed(registry, currentProject.id, true);
    await saveRegistry(updated);
    const p = updated.projects.find((item) => item.id === currentProject.id);
    if (p) {
      setCurrentProject(p);
      onProjectUpdated?.(p);
    }
    setHasEnvrc(false);
    await showToast({ style: Toast.Style.Success, title: t("pd.envrcDismissedToast") });
  };

  // 切换变量敏感状态（保存到 registry，不污染 .env）
  const handleToggleSecret = async (key: string) => {
    const wasSecret = isSecretKey(key, currentProject.customSecrets);
    const { data: registry } = await loadRegistry();
    const updated = toggleProjectSecret(registry, currentProject.id, key);
    await saveRegistry(updated);
    const p = updated.projects.find((item) => item.id === currentProject.id);
    if (p) {
      setCurrentProject(p);
      onProjectUpdated?.(p);
    }
    await showToast({
      style: Toast.Style.Success,
      title: wasSecret ? t("pd.secretOffToast") : t("pd.secretOnToast"),
    });
  };

  // 保存变量表单编辑。编辑按"第几行"定位、原位重建(改名也不会跑到文件末尾);
  // 新建按名字:已有同名就更新那一行(优先启用的),没有就追加
  const handleSaveVariable = async (data: VariableFormData, at?: number) => {
    // 新建撞上已有名字:此前静默覆盖旧值,只提示"已保存"
    if (at === undefined && findEnvLineIndex(lines, data.key) >= 0) {
      const confirmed = await confirmDestructive({
        title: t("pd.overwriteConfirmTitle", { key: data.key }),
        message: t("pd.overwriteConfirmMessage", { file: selectedEnvFile }),
        actionTitle: t("pd.overwriteConfirmAction"),
      });
      if (!confirmed) throw new Error(t("pd.overwriteCancelled"));
    }
    const updatedLines =
      at === undefined
        ? addEnvVariable(lines, data.key, data.value, {
            quote: data.quote,
            disabled: data.disabled,
            comment: data.comment,
          })
        : updateEnvVariableAt(lines, at, {
            key: data.key,
            value: data.value,
            quote: data.quote,
            disabled: data.disabled,
            comment: data.comment,
          });

    // 先写文件,再动 registry 里的敏感名单:写盘失败或用户在冲突框里选了"放弃",名单不能先改了
    // (否则旧名字的自定义标记丢了、文件里却还是旧名字)
    const saved = await saveLines(updatedLines);
    if (!saved) return;

    // 改了名字:名单里关于旧名字的敏感判断跟着改到新名字上,不留死条目
    let secretsNow = currentProject.customSecrets;
    const oldLine = at !== undefined ? lines[at] : undefined;
    if (oldLine?.type === "kv" && oldLine.key !== data.key) {
      const { data: registry, problem } = await loadRegistry();
      if (!problem) {
        const updated = renameProjectSecret(registry, currentProject.id, oldLine.key, data.key);
        await saveRegistry(updated);
        const p = updated.projects.find((item) => item.id === currentProject.id);
        if (p) {
          secretsNow = p.customSecrets;
          setCurrentProject(p);
          onProjectUpdated?.(p);
        }
      }
    }

    // 如果用户在表单里勾选了自定义敏感(改过名的话要用改名后的名单判断,闭包里的还是旧的)
    const isCurrentlySecret = isSecretKey(data.key, secretsNow);
    if (data.isSecret !== isCurrentlySecret) {
      await handleToggleSecret(data.key);
    }
  };

  // 切换某一行的启用/禁用 (# KEY=val)。按行不按名字:同名两行时只动这一行
  const handleToggleEnable = async (at: number) => {
    await saveLines(toggleEnvVariableAt(lines, at));
  };

  // 删除某一行
  const handleDeleteVariable = async (at: number, key: string) => {
    const confirmed = await confirmDestructive({
      title: t("pd.deleteConfirmTitle", { key }),
      message: t("pd.deleteConfirmMessage", { file: selectedEnvFile, key }),
      actionTitle: t("common.delete"),
    });

    if (!confirmed) return;
    await saveLines(removeEnvVariableAt(lines, at));
  };

  // 生成/更新 .env.example
  // 不是整个重新生成,而是把当前 .env 的键合并进已有模板。
  // .env.example 是提交进 git、给团队看的东西,上面经常有人手写补充说明,
  // 整体重生成会把那些内容全冲掉;而且它此前不在快照体系里,冲掉了毫无退路
  const handleGenerateExample = async () => {
    const examplePath = join(currentProject.path, ".env.example");
    const exists = existsSync(examplePath);
    const existingContent = exists ? await readFile(examplePath, "utf8") : "";
    const merged = mergeExampleEnv(parseEnv(existingContent), lines);

    const summary = t("pd.exampleSummary", {
      added: merged.added.length,
      removed: merged.removed.length,
      kept: merged.kept.length,
    });

    if (exists) {
      if (merged.content === existingContent) {
        await showToast({ style: Toast.Style.Success, title: t("pd.exampleNoChangeToast") });
        return;
      }
      const confirmed = await confirmAlert({
        title: t("pd.exampleConfirmTitle"),
        message: t("pd.exampleConfirmMessage", {
          added: merged.added.length,
          removed: merged.removed.length,
          kept: merged.kept.length,
        }),
        primaryAction: { title: t("pd.exampleConfirmAction") },
        dismissAction: { title: t("common.cancel") },
      });
      if (!confirmed) return;
    }

    // 走快照通道,和 .env 一样有退路
    const result = await writeEnvFileWithSnapshot({
      project: currentProject,
      envFilePath: examplePath,
      newContent: merged.content,
      force: true,
    });
    await refreshEnvFiles();
    await showToast({
      style: Toast.Style.Success,
      title: t("pd.exampleSuccessTitle"),
      message: [summary, snapshotLimitHint(result)].filter(Boolean).join(" · "),
    });
  };

  // 复制当前环境为 .env
  const handleCopyAsMainEnv = async () => {
    if (selectedEnvFile === ".env") {
      await showToast({ style: Toast.Style.Failure, title: t("pd.alreadyMainEnvToast") });
      return;
    }
    const targetPath = join(currentProject.path, ".env");

    // 目标 .env 已存在时先问一声。虽然覆盖前会自动打快照、内容捞得回来,
    // 但"按一下就把一整个文件换掉"不该在用户毫无察觉的情况下发生。
    // 这里直接查磁盘而不是查 envFiles 状态:文件可能在界面打开期间被外部创建
    if (existsSync(targetPath)) {
      const confirmed = await confirmDestructive({
        title: t("pd.copyOverwriteConfirmTitle"),
        message: t("pd.copyOverwriteConfirmMessage", { file: selectedEnvFile }),
        actionTitle: t("pd.copyOverwriteConfirmAction"),
      });
      if (!confirmed) return;
    }

    const currentContent = serializeEnv(lines);
    const result = await writeEnvFileWithSnapshot({
      project: currentProject,
      envFilePath: targetPath,
      newContent: currentContent,
      force: true,
    });
    await refreshEnvFiles();
    await showToast({
      style: Toast.Style.Success,
      title: t("pd.copiedAsMainEnvToast", { file: selectedEnvFile }),
      message: snapshotLimitHint(result),
    });
  };

  // 新建出来的环境文件是空的,不知道该填什么——从另一个已有文件借内容过来。
  // "结构"模式复用 generateExampleEnv:只留 KEY 和注释,值清空,不会把密钥搬错环境;
  // "完整"模式原样搬运,连值一起复制,图的是同一批本地值本来就不用改
  const handleFillFromReference = async (sourceFile: string, mode: "structure" | "full") => {
    try {
      const { content: sourceContent } = await readEnvFile(join(currentProject.path, sourceFile));
      const newContent = mode === "structure" ? generateExampleEnv(parseEnv(sourceContent)) : sourceContent;

      const result = await writeEnvFileWithSnapshot({
        project: currentProject,
        envFilePath: currentEnvFilePath,
        newContent,
        force: true,
      });
      await loadCurrentEnvContent();
      await showToast({
        style: Toast.Style.Success,
        title:
          mode === "structure"
            ? t("pd.fillStructureSuccessToast", { file: sourceFile })
            : t("pd.fillFullSuccessToast", { file: sourceFile }),
        message: snapshotLimitHint(result),
      });
    } catch (e) {
      await showFailureToast(t("pd.fillFailedTitle"), e);
    }
  };

  // ---- 方案(设计决议 §十一)----

  const currentContent = serializeEnv(lines);
  const projectPresets = listPresetsForProject(presetsFile, currentProject.id);
  const presetGroups = listPresetGroups(presetsFile, currentProject.id);
  // 文件还没读完时 lines 是空的,这时候比对只会得出"跟一份空方案一致"或"漂移了"的假结果
  /** 内容跟当前文件一模一样的那份,打「当前生效」 */
  const activeIds = new Set(loading ? [] : projectPresets.filter((p) => p.content === currentContent).map((p) => p.id));
  /** 上次套用了某份方案,但现在两边对不上了 */
  const driftPreset = loading
    ? undefined
    : detectPresetDrift(presetsFile, currentProject.id, selectedEnvFile, currentContent);

  /** 方案文件读不出来时不能写:会把还留着数据的坏文件当空的覆盖掉 */
  const persistPresets = async (next: PresetsFile) => {
    if (presetsProblem) throw new Error(t("cfg.corruptedTitle"));
    await savePresets(next);
    setPresetsFile(next);
  };

  // 整份替换,不问直接写。确认这一步由差异页承担(见 handleApplyPreset)
  const applyPresetNow = async (preset: Preset) => {
    try {
      const result = await applyPresetToFile({ project: currentProject, envFilename: selectedEnvFile, preset });
      await loadCurrentEnvContent();
      await loadPresetsState();
      await showToast({
        style: Toast.Style.Success,
        title: t("ps.appliedToast", { name: preset.name, file: selectedEnvFile }),
        message: snapshotLimitHint(result),
      });
    } catch (e) {
      await showFailureToast(t("ps.applyFailedTitle"), e);
    }
  };

  // 目标文件非空时,先进差异页,那一页的主动作才是真正的"套用"——
  // "按一下就换掉一整个文件"不该在用户毫无察觉的情况下发生,而 confirmAlert 只有两个按钮、
  // 放不下"先看差异",索性让差异页本身当确认框。文件是空的就直接套,没有任何东西会被覆盖
  const handleApplyPreset = async (preset: Preset) => {
    if (currentContent.trim() === "") {
      await applyPresetNow(preset);
      return;
    }
    push(
      <PresetDiffView
        preset={preset}
        envFilename={selectedEnvFile}
        currentContent={currentContent}
        customSecrets={currentProject.customSecrets}
        mode="apply"
        onApply={() => applyPresetNow(preset)}
      />,
    );
  };

  const handleSaveAsPreset = async (data: PresetMetaData) => {
    const { file, preset } = addPreset(presetsFile, {
      projectId: currentProject.id,
      name: data.name,
      note: data.note,
      group: data.group,
      content: currentContent,
    });
    // 刚存的那份跟文件当然一致;顺手记成"已套用",之后一改就能提示漂移
    await persistPresets(recordPresetApplied(file, currentProject.id, selectedEnvFile, preset.id));
    await showToast({ style: Toast.Style.Success, title: t("ps.savedToast", { name: preset.name }) });
  };

  // 从零写一份,跟当前文件无关,所以不记"已套用"
  const handleCreateBlankPreset = async (data: PresetMetaData) => {
    const { file, preset } = addPreset(presetsFile, {
      projectId: currentProject.id,
      name: data.name,
      note: data.note,
      group: data.group,
      content: data.content ?? "",
    });
    await persistPresets(file);
    await showToast({ style: Toast.Style.Success, title: t("ps.savedToast", { name: preset.name }) });
  };

  const handleUpdatePresetFromFile = async (preset: Preset) => {
    const confirmed = await confirmAlert({
      title: t("ps.driftUpdateConfirmTitle", { name: preset.name, file: selectedEnvFile }),
      message: t("ps.driftUpdateConfirmMessage"),
      primaryAction: { title: t("ps.driftUpdateConfirmAction") },
      dismissAction: { title: t("common.cancel") },
    });
    if (!confirmed) return;
    try {
      await persistPresets(updatePreset(presetsFile, preset.id, { content: currentContent }));
      await showToast({ style: Toast.Style.Success, title: t("ps.updatedToast", { name: preset.name }) });
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  const handleDismissDrift = async () => {
    try {
      await persistPresets(clearPresetApplied(presetsFile, currentProject.id, selectedEnvFile));
      await showToast({ style: Toast.Style.Success, title: t("ps.driftDismissedToast") });
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  /**
   * 文件级动作(快照历史、生成 example、整份编辑……),启用行、禁用行、空列表三处共用。
   * 此前只挂在启用行上:文件一旦被清空(误删光、套了空方案)就进不去快照历史,最需要回滚的时候入口没了
   */
  const fileActions = (
    <ActionPanel.Section title={t("pd.sectionEnvAndSnapshot")}>
      <Action.Push
        title={t("pd.actionSnapshotHistory")}
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        target={
          <SnapshotHistoryView
            project={currentProject}
            envFilename={selectedEnvFile}
            envFilePath={currentEnvFilePath}
            currentContent={serializeEnv(lines)}
            customSecrets={currentProject.customSecrets}
            onRestored={loadCurrentEnvContent}
          />
        }
      />
      <Action
        title={t("pd.actionGenerateExample")}
        icon={Icon.Wand}
        shortcut={{ modifiers: ["cmd"], key: "g" }}
        onAction={handleGenerateExample}
      />
      {/* 不给快捷键:⌘⇧C 在 Raycast 里是"复制到剪贴板"的惯例,这个动作是写文件,低频、走面板 */}
      {selectedEnvFile !== ".env" && (
        <Action title={t("pd.actionCopyAsMainEnv")} icon={Icon.Duplicate} onAction={handleCopyAsMainEnv} />
      )}
      <Action.Push
        title={t("pd.createEnvFileItem")}
        icon={Icon.NewDocument}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={
          <CreateEnvFileForm
            projectPath={currentProject.path}
            onCreated={async (filename) => {
              await refreshEnvFiles();
              setSelectedEnvFile(filename);
            }}
          />
        }
      />
      <Action.Push
        title={t("pd.actionEditRaw")}
        icon={Icon.TextDocument}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        target={
          <RawContentForm
            navTitle={t("pd.editRawNavTitle", { file: selectedEnvFile })}
            initialContent={currentContent}
            hint={t("pd.editRawHint")}
            onSave={(content) => saveLines(parseEnv(content))}
          />
        }
      />
      <Action.OpenWith title={t("mv.actionOpenWith")} path={currentEnvFilePath} />
    </ActionPanel.Section>
  );

  /** 方案相关的一组动作,启用区、禁用区、空列表三处共用 */
  const presetActions = (
    <ActionPanel.Section title={t("ps.sectionTitle")}>
      {projectPresets.length > 0 && (
        <ActionPanel.Submenu title={t("ps.applyMenuTitle")} icon={Icon.Replace}>
          {groupPresets(projectPresets).map((bucket) => (
            <ActionPanel.Section
              key={bucket.group ?? "__ungrouped__"}
              // 一个分组都没有时不摆"未分组"标题,同管理方案页
              title={
                presetGroups.length > 0
                  ? bucket.group
                    ? t("grp.section", { group: bucket.group })
                    : t("grp.ungrouped")
                  : undefined
              }
            >
              {bucket.presets.map((preset) => (
                <Action
                  key={preset.id}
                  title={activeIds.has(preset.id) ? `${preset.name}  ${t("ps.liveTag")}` : preset.name}
                  icon={activeIds.has(preset.id) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Box}
                  onAction={() => handleApplyPreset(preset)}
                />
              ))}
            </ActionPanel.Section>
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.Push
        title={t("ps.saveAsNew")}
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        target={
          <PresetMetaForm
            existingGroups={presetGroups}
            existingNames={projectPresets.map((p) => p.name)}
            contentPreview={{
              content: currentContent,
              sourceFile: selectedEnvFile,
              customSecrets: currentProject.customSecrets,
            }}
            onSave={handleSaveAsPreset}
          />
        }
      />
      <Action.Push
        title={t("ps.createBlank")}
        icon={Icon.NewDocument}
        target={
          <PresetMetaForm
            navTitle={t("ps.createBlank")}
            existingGroups={presetGroups}
            existingNames={projectPresets.map((p) => p.name)}
            editableContent
            onSave={handleCreateBlankPreset}
          />
        }
      />
      <Action.Push
        title={t("ps.manage")}
        icon={Icon.Box}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        target={
          <PresetsView
            projectId={currentProject.id}
            projectName={currentProject.name}
            envFilename={selectedEnvFile}
            currentContent={currentContent}
            customSecrets={currentProject.customSecrets}
            onApply={applyPresetNow}
            onChanged={loadPresetsState}
          />
        }
      />
    </ActionPanel.Section>
  );

  // 切换敏感明文显示
  const toggleRevealKey = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 每一项带上"第几行":列表项的标识、编辑 / 启停 / 删除全按行走,同名两行互不干扰
  const kvEntries = lines
    .map((line, index) => ({ line, index }))
    .filter((e): e is { line: Extract<EnvLine, { type: "kv" }>; index: number } => e.line.type === "kv");
  const enabledKvs = kvEntries.filter((e) => !e.line.disabled);
  const disabledKvs = kvEntries.filter((e) => e.line.disabled);
  // 同一个 key 写了几行。dotenv 取第一行、别的库取最后一行,静默出错,所以要标出来
  const keyCounts = countEnvKeys(lines);
  /**
   * 值照文件里的样子显示:有引号就带引号(`"hello world"`),没有就裸值。
   * 此前用 `""` / `''` 小标签表示引号形态,看不懂;直接把引号画出来,看一眼就知道文件里怎么写的
   */
  const displayValueOf = (kv: Extract<EnvLine, { type: "kv" }>, masked: boolean, revealed: boolean) => {
    const value = masked && !revealed ? maskSecret(kv.value) : kv.value;
    return kv.quote ? `${kv.quote}${value}${kv.quote}` : value;
  };
  // 行内注释直接用灰字显示在右侧(项目列表没有详情面板,右边放得下文字),太长悬停看全文;此前是一个气泡图标,不知道是什么
  const commentAccessory = (comment: string | undefined) =>
    comment ? [{ text: { value: `# ${comment}`, color: Color.SecondaryText }, tooltip: comment }] : [];
  // 带 export 前缀的行标一下:dotenv 认这种写法,source 进 shell 也能用,但跟普通行长得不一样
  const exportAccessory = (exportPrefix: boolean | undefined) =>
    exportPrefix ? [{ tag: { value: "export", color: Color.SecondaryText }, tooltip: t("pd.exportTooltip") }] : [];
  const duplicateAccessory = (key: string) => {
    const count = keyCounts.get(key) ?? 0;
    return count > 1
      ? [
          {
            tag: { value: t("pd.duplicateTag"), color: Color.Orange },
            tooltip: t("pd.duplicateTooltip", { key, count }),
          },
        ]
      : [];
  };

  // 能借内容的候选文件:必须是磁盘上真实存在的(envFiles 里的 ".env" 可能只是探测逻辑
  // 塞进去的占位项,文件本身还不存在),且不能是当前正在看的这个空文件自己
  const otherExistingEnvFiles = envFiles.filter(
    (f) => f !== selectedEnvFile && existsSync(join(currentProject.path, f)),
  );
  // .env.example 本身就没有真实值,只适合出现在"参考结构"里——放进"完整复制(含真实值)"
  // 会跟菜单文案对不上,让人以为漏填了什么
  const hasExample = existsSync(join(currentProject.path, ".env.example"));
  const structureCandidates = hasExample ? [".env.example", ...otherExistingEnvFiles] : otherExistingEnvFiles;
  const fullCopyCandidates = otherExistingEnvFiles;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={t("pd.searchPlaceholder", { file: selectedEnvFile })}
      {...(initialSelectedKey
        ? { selectedItemId, onSelectionChange: (id: string | null) => setSelectedItemId(id ?? undefined) }
        : {})}
      searchBarAccessory={
        // 文件列表还没探测出来之前不渲染下拉框:那一刻下拉里只剩"新建"这一个哨兵项,
        // 而下拉在挂载时会把当前选中项回调一次,于是一进项目就自己弹出了新建表单
        envFiles.length === 0 ? undefined : (
          <List.Dropdown
            tooltip={t("pd.switchEnvFileTooltip")}
            value={selectedEnvFile}
            onChange={(val) => {
              // 双保险:哨兵只在真有文件可选时才认,挂载期的回调一律忽略
              if (val === CREATE_ENV_FILE_VALUE && envFiles.length > 0) {
                push(
                  <CreateEnvFileForm
                    projectPath={currentProject.path}
                    onCreated={async (filename) => {
                      await refreshEnvFiles();
                      setSelectedEnvFile(filename);
                    }}
                  />,
                );
                return;
              }
              if (val === CREATE_ENV_FILE_VALUE) return;
              setSelectedEnvFile(val);
            }}
            placeholder={t("common.searchPlaceholder")}
          >
            <List.Dropdown.Section>
              {envFiles.map((f) => (
                <List.Dropdown.Item key={f} value={f} title={f} icon={Icon.Document} />
              ))}
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              <List.Dropdown.Item
                value={CREATE_ENV_FILE_VALUE}
                title={t("pd.createEnvFileItem")}
                icon={Icon.NewDocument}
              />
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {hasEnvrc && (
        <List.Section title={t("pd.sectionEnvrc")}>
          <List.Item
            icon={{ source: Icon.Info, tintColor: Color.Yellow }}
            title={t("pd.envrcTitle")}
            subtitle={t("pd.envrcSubtitle")}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("pd.envrcLearnMore")}
                  icon={Icon.Info}
                  target={<Detail markdown={t("pd.envrcDetailMarkdown")} navigationTitle={t("pd.envrcTitle")} />}
                />
                <Action title={t("pd.envrcDismiss")} icon={Icon.BellDisabled} onAction={handleDismissEnvrc} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {presetsProblem && (
        <List.Section title={t("cfg.sectionTitle")}>
          <ConfigProblemItem problem={presetsProblem} />
        </List.Section>
      )}

      {driftPreset && (
        <List.Section title={t("ps.sectionTitle")}>
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title={t("ps.driftTitle", { name: driftPreset.name, file: selectedEnvFile })}
            subtitle={t("ps.driftSubtitle")}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("ps.driftViewDiff")}
                  icon={Icon.Layers}
                  target={
                    <PresetDiffView
                      preset={driftPreset}
                      envFilename={selectedEnvFile}
                      currentContent={currentContent}
                      customSecrets={currentProject.customSecrets}
                      mode="drift"
                    />
                  }
                />
                <Action
                  title={t("ps.driftUpdatePreset", { name: driftPreset.name })}
                  icon={Icon.SaveDocument}
                  onAction={() => handleUpdatePresetFromFile(driftPreset)}
                />
                <Action title={t("ps.driftDismiss")} icon={Icon.BellDisabled} onAction={handleDismissDrift} />
                {fileActions}
                {presetActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={t("pd.sectionEnabled")} subtitle={t("pd.countItems", { count: enabledKvs.length })}>
        {enabledKvs.map(({ line: kv, index }) => {
          const isSecret = isSecretKey(kv.key, currentProject.customSecrets, kv.value);
          const isEncrypted = isEncryptedValue(kv.value);
          const isRevealed = revealedKeys.has(kv.key);
          const displayValue = displayValueOf(kv, isSecret || isEncrypted, isRevealed);

          return (
            <List.Item
              key={lineItemId(index)}
              id={lineItemId(index)}
              title={kv.key}
              subtitle={displayValue}
              accessories={[
                ...duplicateAccessory(kv.key),
                ...exportAccessory(kv.exportPrefix),
                ...commentAccessory(kv.comment),
                ...(isEncrypted ? [{ tag: { value: t("pd.encryptedTag"), color: Color.Purple } }] : []),
                ...(isSecret
                  ? [{ icon: { source: Icon.Lock, tintColor: Color.Orange }, tooltip: t("pd.lockTooltip") }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {/* 回车永远是「复制值」,不管敏感与否(复制本来就不进剪贴板历史);显示明文统一 ⌘⇧M。
                        concealed:变量值可能是密钥,不该留在 Raycast 的剪贴板历史里被搜到 */}
                    <Action.CopyToClipboard title={t("pd.actionCopyValue")} content={kv.value} concealed />
                    {(isSecret || isEncrypted) && (
                      <Action
                        title={isRevealed ? t("pd.actionHide") : t("pd.actionReveal")}
                        icon={isRevealed ? Icon.EyeDisabled : Icon.Eye}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        onAction={() => toggleRevealKey(kv.key)}
                      />
                    )}
                    <Action.CopyToClipboard title={t("pd.actionCopyKey")} content={kv.key} />
                    {/* 粘到别的 .env 或终端里最常用的其实是整行,不该逼人复制两次再自己拼 */}
                    <Action.CopyToClipboard
                      title={t("pd.actionCopyPair")}
                      content={formatKVRaw(kv.key, kv.value, {
                        quote: kv.quote,
                        comment: kv.comment,
                        exportPrefix: kv.exportPrefix,
                        end: "",
                      })}
                      concealed
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title={t("pd.sectionVariableActions")}>
                    <Action.Push
                      title={t("pd.actionEdit")}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <EditVariableForm
                          initialData={{
                            key: kv.key,
                            value: kv.value,
                            quote: kv.quote,
                            disabled: kv.disabled,
                            comment: kv.comment,
                          }}
                          customSecrets={currentProject.customSecrets}
                          onSave={(data) => handleSaveVariable(data, index)}
                        />
                      }
                    />
                    <Action.Push
                      title={t("pd.actionNew")}
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={
                        <EditVariableForm
                          customSecrets={currentProject.customSecrets}
                          onSave={(data) => handleSaveVariable(data)}
                        />
                      }
                    />
                    <Action
                      title={t("pd.actionToggleOff")}
                      icon={Icon.Pause}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => handleToggleEnable(index)}
                    />
                    <Action
                      title={isSecret ? t("pd.actionSecretOff") : t("pd.actionSecretOn")}
                      icon={isSecret ? Icon.LockUnlocked : Icon.Lock}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() => handleToggleSecret(kv.key)}
                    />
                    <Action
                      title={t("pd.actionDelete")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteVariable(index, kv.key)}
                    />
                  </ActionPanel.Section>

                  {fileActions}
                  {presetActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {disabledKvs.length > 0 && (
        <List.Section title={t("pd.sectionDisabled")} subtitle={t("pd.countItems", { count: disabledKvs.length })}>
          {disabledKvs.map(({ line: kv, index }) => {
            const isSecret = isSecretKey(kv.key, currentProject.customSecrets, kv.value);
            const isEncrypted = isEncryptedValue(kv.value);
            const isRevealed = revealedKeys.has(kv.key);
            // 禁用不等于不敏感:被注释掉的 PASSWORD 仍然是密码,打码规则必须跟启用项一致
            const displayValue = displayValueOf(kv, isSecret || isEncrypted, isRevealed);

            return (
              <List.Item
                key={lineItemId(index)}
                id={lineItemId(index)}
                title={kv.key}
                subtitle={displayValue}
                accessories={[
                  ...duplicateAccessory(kv.key),
                  ...exportAccessory(kv.exportPrefix),
                  ...commentAccessory(kv.comment),
                  ...(isSecret
                    ? [{ icon: { source: Icon.Lock, tintColor: Color.Orange }, tooltip: t("pd.lockTooltip") }]
                    : []),
                  { tag: { value: t("pd.disabledTag"), color: Color.SecondaryText } },
                ]}
                actions={
                  <ActionPanel>
                    {/* 跟启用行一样:回车 = 复制值;启用是写文件的动作,用 ⌘T */}
                    <Action.CopyToClipboard title={t("pd.actionCopyValue")} content={kv.value} concealed />
                    {(isSecret || isEncrypted) && (
                      <Action
                        title={isRevealed ? t("pd.actionHide") : t("pd.actionReveal")}
                        icon={isRevealed ? Icon.EyeDisabled : Icon.Eye}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        onAction={() => toggleRevealKey(kv.key)}
                      />
                    )}
                    <Action.CopyToClipboard title={t("pd.actionCopyKey")} content={kv.key} />
                    {/* 照着文件里的样子复制:这一行本来就是注释掉的,带着 # 才是"整行" */}
                    <Action.CopyToClipboard
                      title={t("pd.actionCopyPair")}
                      content={formatKVRaw(kv.key, kv.value, {
                        quote: kv.quote,
                        comment: kv.comment,
                        exportPrefix: kv.exportPrefix,
                        disabled: true,
                        end: "",
                      })}
                      concealed
                    />
                    <Action
                      title={t("pd.actionToggleOn")}
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => handleToggleEnable(index)}
                    />
                    <Action.Push
                      title={t("pd.actionEdit")}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <EditVariableForm
                          initialData={{
                            key: kv.key,
                            value: kv.value,
                            quote: kv.quote,
                            disabled: kv.disabled,
                            comment: kv.comment,
                          }}
                          customSecrets={currentProject.customSecrets}
                          onSave={(data) => handleSaveVariable(data, index)}
                        />
                      }
                    />
                    <Action
                      title={t("pd.actionDelete")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteVariable(index, kv.key)}
                    />
                    {fileActions}
                    {presetActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {kvEntries.length === 0 && !loading && (
        <List.EmptyView
          title={t("pd.emptyTitle")}
          description={t("pd.emptyDesc", { path: currentEnvFilePath })}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("pd.actionNew")}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={
                  <EditVariableForm
                    customSecrets={currentProject.customSecrets}
                    onSave={(data) => handleSaveVariable(data)}
                  />
                }
              />
              {structureCandidates.length > 0 && (
                <ActionPanel.Submenu title={t("pd.fillStructureMenuTitle")} icon={Icon.Document}>
                  {structureCandidates.map((f) => (
                    <Action
                      key={f}
                      title={f}
                      icon={Icon.Document}
                      onAction={() => handleFillFromReference(f, "structure")}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
              {fullCopyCandidates.length > 0 && (
                <ActionPanel.Submenu title={t("pd.fillFullMenuTitle")} icon={Icon.Duplicate}>
                  {fullCopyCandidates.map((f) => (
                    <Action
                      key={f}
                      title={f}
                      icon={Icon.Document}
                      onAction={() => handleFillFromReference(f, "full")}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
              {fileActions}
              {presetActions}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
