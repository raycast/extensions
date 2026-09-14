import { join } from "node:path";
import { type Preset, type ProjectMeta, recordPresetApplied } from "@env-keeper/core";
import { loadPresets, savePresets, writeEnvFileWithSnapshot, type WriteEnvResult } from "./storage.js";

/**
 * 把一份方案整份写进某个环境文件,并记下"这个文件现在对应哪份方案"(之后手改了才判得出漂移)。
 * 项目页和 Jump to 直接打开的方案页共用——方案页不该只能借道项目页打开。
 *
 * 不问直接写(force):确认这一步由差异页承担。
 * 方案文件本身读不出来时跳过记账:文件已经套用成功了,不能因为记不下账就报"套用失败"。
 */
export async function applyPresetToFile(options: {
  project: ProjectMeta;
  envFilename: string;
  preset: Preset;
}): Promise<WriteEnvResult> {
  const { project, envFilename, preset } = options;
  const result = await writeEnvFileWithSnapshot({
    project,
    envFilePath: join(project.path, envFilename),
    newContent: preset.content,
    force: true,
  });
  if (!result.success) throw new Error(result.error ?? "write failed");

  // 读最新的再记,别拿调用方手里可能已经旧了的快照去覆盖
  const presets = await loadPresets();
  if (!presets.problem) {
    await savePresets(recordPresetApplied(presets.data, project.id, envFilename, preset.id));
  }
  return result;
}
