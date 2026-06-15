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
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getOpenTabs,
  isInstalled,
  isRunning,
  openApp,
  PdfFile,
  revealInFinder,
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

  useEffect(() => {
    load();
  }, [load]);

  if (!isLoading && !isInstalled()) {
    return (
      <List>
        <List.EmptyView
          title="PDF Expert Is Not Installed"
          description="Install PDF Expert from the App Store to use this extension"
          icon={Icon.Warning}
        />
      </List>
    );
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
                <Action
                  title="Reveal in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={async () => {
                    try {
                      revealInFinder(tab.path);
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could Not Reveal File",
                        message:
                          err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
                <Action
                  title="Copy File to Clipboard"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy({ file: tab.path });
                    await showHUD("File copied");
                  }}
                />
                <Action
                  title="Copy File Path"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
