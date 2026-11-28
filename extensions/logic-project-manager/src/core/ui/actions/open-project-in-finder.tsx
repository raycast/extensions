import { Action, Icon } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import { strings } from "@/strings";

// 工程包用「打开」会交给 DAW，所以改成在 Finder 里选中它；普通文件夹照旧在 Finder 里打开。
export function OpenProjectInFinderAction({ kind, folderPath }: { kind: Project["kind"]; folderPath: string }) {
  return kind === "package" ? (
    <Action.ShowInFinder
      path={folderPath}
      title={strings.showInFinder}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
    />
  ) : (
    <Action.Open
      title={strings.openInFinder}
      icon={Icon.Finder}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      target={folderPath}
    />
  );
}
