import { Action, Icon, Keyboard } from "@raycast/api";
import { panelUrl } from "./dokploy-pages";

export function OpenInDokployAction({ url, path, onOpen }: { url: string; path: string; onOpen?: () => void }) {
  return (
    <Action.OpenInBrowser
      icon={Icon.Window}
      title="Open in Dokploy"
      url={panelUrl(url, path)}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
      onOpen={onOpen}
    />
  );
}
