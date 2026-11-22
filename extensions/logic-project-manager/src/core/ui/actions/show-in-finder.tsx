import { Action } from "@raycast/api";
import { strings } from "@/strings";

// 在 Finder 里选中一个文件或文件夹。各界面共用，快捷键一致。
export function ShowInFinderAction({ path }: { path: string }) {
  return (
    <Action.ShowInFinder path={path} title={strings.showInFinder} shortcut={{ modifiers: ["cmd", "opt"], key: "o" }} />
  );
}
