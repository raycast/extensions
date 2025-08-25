import { Action } from "@raycast/api";
import { isWin } from "./utils";

export function OpenInWindowsExplorerAction({ uri }: { uri: string }) {
  return <Action title="Reveal in Explorer" onAction={() => open(uri)} />;
}

export function OpenInShell({ path }: { path: string }) {
  if (isWin) {
    return <OpenInWindowsExplorerAction uri={path} />;
  }
  return <Action.ShowInFinder path={path} />;
}
