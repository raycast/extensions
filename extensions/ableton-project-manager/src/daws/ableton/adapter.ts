import { getAlsMetadata } from "./als-metadata";
import type { DawAdapter, ProjectFileMetadata } from "../types";

/** Ableton Live 适配器：工程文件为 .als（Set），元数据来自压缩的 ALS XML。 */
export const abletonAdapter: DawAdapter = {
  id: "ableton",
  projectFileExtension: ".als",
  appNameMatch: "ableton live",

  async parseProjectFile(filePath: string): Promise<ProjectFileMetadata> {
    const metadata = await getAlsMetadata(filePath);
    return {
      bpm: metadata.bpm,
      timeSignature: metadata.timeSignature,
      // inKey=false 表示工程未启用音阶，此时调性无意义，归一化为 null。
      key: metadata.inKey === false ? null : metadata.key,
    };
  },
};
