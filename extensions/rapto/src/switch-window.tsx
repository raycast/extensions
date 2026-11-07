import { Action, ActionPanel, closeMainWindow, Icon, List, PopToRootType, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { RaptoErrorView } from "./components";
import { focusWindow, listWindows, RaptoWindow } from "./rapto";

export default function SwitchWindow() {
  // Errors are shown as an empty view instead of the default failure toast
  const { data: windows, isLoading, error, revalidate } = usePromise(listWindows, [], { onError: () => undefined });

  if (error) {
    return (
      <List>
        <RaptoErrorView error={error} onRetry={revalidate} />
      </List>
    );
  }

  // The first window is the one you came from, so Enter goes to the one before it, like ⌘Tab
  const initialSelection = windows && windows.length > 1 ? String(windows[1].id) : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search windows by app or title" selectedItemId={initialSelection}>
      {windows?.map((window) => (
        <WindowItem key={window.id} window={window} />
      ))}
    </List>
  );
}

function WindowItem({ window }: { window: RaptoWindow }) {
  const accessories: List.Item.Accessory[] = [];
  if (window.display) accessories.push({ text: window.display });
  accessories.push({
    tag: window.isFullScreen ? "Full Screen" : window.isCurrentDesktop ? "This desktop" : `Desktop ${window.desktop}`,
  });

  return (
    <List.Item
      id={String(window.id)}
      icon={window.appPath ? { fileIcon: window.appPath } : Icon.AppWindow}
      title={window.title}
      subtitle={window.title === window.app ? undefined : window.app}
      keywords={[window.app]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Window"
            icon={Icon.ArrowRight}
            onAction={async () => {
              await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              const focused = await focusWindow(window.id);
              if (!focused) await showToast({ style: Toast.Style.Failure, title: "That window is no longer open" });
            }}
          />
          <Action.CopyToClipboard title="Copy Window Title" content={window.title} />
        </ActionPanel>
      }
    />
  );
}
