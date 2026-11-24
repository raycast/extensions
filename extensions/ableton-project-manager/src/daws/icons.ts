import type { ProjectKind } from "./types";

// 项目在列表里的图标。每个仓库在 src/daws/icons.ts 里各给一份，共用代码只从这里取。
// Ableton 的项目都是文件夹，不分形态。
export const projectIcon: (kind: ProjectKind) => string = () => "icon.png";
