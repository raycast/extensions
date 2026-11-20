import { abletonAdapter } from "./ableton/adapter";
import type { DawAdapter } from "./types";

export type { DawAdapter, DawId, ProjectFileMetadata } from "./types";

/** 当前激活的 DAW 适配器。日后支持 Logic（LPM）时在此切换/选择。 */
export const daw: DawAdapter = abletonAdapter;
