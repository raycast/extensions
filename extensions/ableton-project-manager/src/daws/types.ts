/** 一个 DAW 的标识。目前仅 Ableton；日后新增 Logic（LPM）时扩展这里。 */
export type DawId = "ableton" | "logic";

/** 从 DAW 工程文件（Ableton 的 .als Set、Logic 的 .logicx 等）解析出的音乐元数据。 */
export type ProjectFileMetadata = {
  bpm: number | null;
  timeSignature: string | null;
  key: string | null;
};

/**
 * DAW 适配器：把各家 DAW 真正不同的部分收到一处，核心逻辑（元数据、合集、文档、
 * bounce 聚合、播放等）全部与具体 DAW 无关，只经由本接口与 DAW 打交道。
 * 新增一个 DAW（如 Logic）时，只需实现一份本接口。
 */
export interface DawAdapter {
  /** DAW 标识。 */
  readonly id: DawId;

  /** 工程文件后缀（含点），如 ".als"。用于探测工程文件夹、列出工程文件、计数。 */
  readonly projectFileExtension: string;

  /** 匹配 DAW 桌面应用的名称子串（小写），供 getApplications 查找，如 "ableton live"。 */
  readonly appNameMatch: string;

  /** 解析单个工程文件的音乐元数据（BPM / 拍号 / 调）。读不到时各字段为 null。 */
  parseProjectFile(filePath: string): Promise<ProjectFileMetadata>;
}
