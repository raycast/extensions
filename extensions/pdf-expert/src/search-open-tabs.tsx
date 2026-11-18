import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { NotInstalledList, useLoadOnMount } from "./lib/not-installed-view";
import { CopyFileAction, RevealInFinderAction } from "./lib/pdf-file-actions";
import {
  getOpenTabs,
  isInstalled,
  isRunning,
  openApp,
  PdfFile,
  switchToTab,
} from "./lib/pdf-expert";
import { shortenPath } from "./lib/utils";

export default function SearchOpenTabs() {
  const [tabs, setTabs] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appRunning, setAppRunning] = useState(true);

  const load = useCallback(() => {
    if (!isInstalled()) {
      setAppRunning(false);
      setIsLoading(false);
      return;
    }
    const running = isRunning();
    setAppRunning(running);
    if (running) {
      setTabs(getOpenTabs());
    } else {
      setTabs([]);
    }
    setIsLoading(false);
  }, []);

  useLoadOnMount(load);

  if (!isLoading && !isInstalled()) {
    return <NotInstalledList />;
  }

  if (!isLoading && !appRunning) {
    return (
      <List>
        <List.EmptyView
          title="PDF Expert Is Not Running"
          description="Open PDF Expert to see your tabs"
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Open PDF Expert"
                icon={Icon.AppWindow}
                onAction={async () => {
                  try {
                    openApp();
                    await closeMainWindow();
                    await popToRoot();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could Not Open PDF Expert",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter open tabs…">
      {tabs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No PDFs Open"
          description="Open a PDF in PDF Expert to see it here"
          icon={Icon.Document}
        />
      ) : (
        tabs.map((tab) => (
          <List.Item
            key={tab.path}
            title={tab.name}
            subtitle={shortenPath(tab.folder)}
            icon={Icon.Document}
            keywords={tab.name.split(/[_\-\s]+/).flatMap((w) => {
              const parts = w.split(/(?<=[a-z])(?=[A-Z])/);
              return parts.length > 1 ? [w, ...parts] : [w];
            })}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Tab"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    try {
                      switchToTab(tab.path);
                      await closeMainWindow();
                      await popToRoot();
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could Not Switch Tab",
                        message:
                          err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
                {tab.exists && <RevealInFinderAction path={tab.path} />}
                {tab.exists && <CopyFileAction path={tab.path} />}
                <Action
                  title="Copy File Path"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={async () => {
                    await Clipboard.copy(tab.path);
                    await showHUD("Path copied");
                  }}
                />
                <Action
                  title="Copy File Name"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(tab.fullName);
                    await showHUD("Name copied");
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
