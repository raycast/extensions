import type { ProjectKind } from "./types";

// 项目在列表里的图标。每个仓库在 src/daws/icons.ts 里各给一份，共用代码只从这里取。
// Package 形态（单个 .logicx）和 Folder 形态分开显示。
export function projectIcon(kind: ProjectKind): string {
  return kind === "package" ? "package.png" : "icon.png";
}
