import { logicAdapter } from "./logic/adapter";
import type { DawAdapter } from "./types";

export type { DawAdapter, DawId, DawSet, DetectedProject, ProjectFileMetadata, ProjectKind } from "./types";

/** 当前激活的 DAW 适配器。APM 在这里用 Ableton 的，./ui.ts 里的视图也跟着换。 */
export const daw: DawAdapter = logicAdapter;
