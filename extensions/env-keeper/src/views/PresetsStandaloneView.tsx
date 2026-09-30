import { List, showToast, Toast } from "@raycast/api";
import { join } from "node:path";
import { useEffect, useState } from "react";
import type { Preset, ProjectMeta } from "@env-keeper/core";
import { snapshotLimitHint, t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { applyPresetToFile } from "../services/presetApply.js";
import { readEnvFile } from "../services/storage.js";
import { PresetsView } from "./PresetsView.js";

const DEFAULT_ENV_FILE = ".env";

/**
 * 不经过项目页、直接打开某个项目的「管理方案」(Jump to 用)。
 * 方案页本身要知道"当前文件的内容"才能标「当前生效」和算差异,这里替项目页把 .env 读出来。
 * 只认 .env:从 Jump to 进来没有"当前选中的环境文件"这个上下文,取默认的
 */
export function PresetsStandaloneView({ project, presetId }: { project: ProjectMeta; presetId: string }) {
  const [content, setContent] = useState<string | undefined>();

  const load = async () => {
    try {
      const { content } = await readEnvFile(join(project.path, DEFAULT_ENV_FILE), { withFingerprint: false });
      setContent(content);
    } catch (e) {
      // 目录不在了之类:方案页照样能开,只是没有"当前生效"可标
      setContent("");
      await showFailureToast(t("jt.loadFailedTitle"), e);
    }
  };

  useEffect(() => {
    load();
  }, [project.path]);

  const handleApply = async (preset: Preset) => {
    try {
      const result = await applyPresetToFile({ project, envFilename: DEFAULT_ENV_FILE, preset });
      await load();
      await showToast({
        style: Toast.Style.Success,
        title: t("ps.appliedToast", { name: preset.name, file: DEFAULT_ENV_FILE }),
        message: snapshotLimitHint(result),
      });
    } catch (e) {
      await showFailureToast(t("ps.applyFailedTitle"), e);
    }
  };

  if (content === undefined) return <List isLoading navigationTitle={t("ps.navTitle", { project: project.name })} />;

  return (
    <PresetsView
      projectId={project.id}
      projectName={project.name}
      envFilename={DEFAULT_ENV_FILE}
      currentContent={content}
      customSecrets={project.customSecrets}
      onApply={handleApply}
      onChanged={load}
      initialSelectedId={presetId}
    />
  );
}
