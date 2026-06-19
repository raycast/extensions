import { Action, type Keyboard, Icon, open } from "@raycast/api";
import { isWin } from "./utils";

export function OpenInWindowsExplorerAction({ uri, shortcut }: { uri: string; shortcut?: Keyboard.Shortcut }) {
  return <Action title="Reveal in Explorer" icon={Icon.Folder} shortcut={shortcut} onAction={() => open(uri)} />;
}

export function OpenInShell({ path, shortcut }: { path: string; shortcut?: Keyboard.Shortcut }) {
  if (isWin) {
    return <OpenInWindowsExplorerAction uri={path} shortcut={shortcut} />;
  }
  return <Action.ShowInFinder path={path} shortcut={shortcut} />;
}
