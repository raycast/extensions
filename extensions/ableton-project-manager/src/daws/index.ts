import { abletonAdapter } from "./ableton/adapter";
import type { DawAdapter } from "./types";

export type { DawAdapter, DawId, DawSet, DetectedProject, ProjectFileMetadata, ProjectKind } from "./types";

/** 当前激活的 DAW 适配器。LPM 在这里换成 Logic 的，同时换掉 ./ui.ts 里的视图。 */
export const daw: DawAdapter = abletonAdapter;
