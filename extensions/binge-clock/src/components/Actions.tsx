import { Action, Icon, Keyboard } from "@raycast/api";

export function OpenInBrowserAction({ url }: { url: string }) {
  return <Action.OpenInBrowser title="Open in Browser" url={url} />;
}

export function CopyWatchTimeAction({ title, detailedTime }: { title: string; detailedTime: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Watch Time"
      icon={{ source: Icon.Clock }}
      content={`${title}: ${detailedTime}`}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

export function CopyUrlAction({ url }: { url: string }) {
  return <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyName} />;
}

export function ToggleDetailAction({
  isShowingDetail,
  setIsShowingDetail,
}: {
  isShowingDetail: boolean;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Action
      icon={Icon.AppWindowSidebarLeft}
      title="Toggle Detail"
      onAction={() => setIsShowingDetail(!isShowingDetail)}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "i" },
        Windows: { modifiers: ["ctrl"], key: "i" },
      }}
    />
  );
}

export function ToggleLayoutAction({ layout, onToggleLayout }: { layout: string; onToggleLayout: () => void }) {
  return (
    <Action
      title="Toggle Layout"
      icon={layout === "grid" ? Icon.AppWindowList : Icon.AppWindowGrid3x3}
      onAction={onToggleLayout}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
    />
  );
}
