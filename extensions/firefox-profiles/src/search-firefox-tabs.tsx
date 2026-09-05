import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { useEffect, useState } from "react";
import { FirefoxTab, loadFirefoxTabs } from "./firefox";

const execFileAsync = promisify(execFile);

function hostname(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

async function openTab(tab: FirefoxTab, firefoxAppPath: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${tab.title}` });
  try {
    await closeMainWindow();
    const firefoxExecutable = path.join(firefoxAppPath, "Contents", "MacOS", "firefox");
    await execFileAsync(firefoxExecutable, ["-profile", tab.profile.profilePath, "-new-tab", tab.url]);
    toast.style = Toast.Style.Success;
    toast.title = `Opened in ${tab.profile.name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open Firefox tab";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function Command() {
  const { firefoxAppPath: firefoxApplication } = getPreferenceValues<Preferences.SearchFirefoxTabs>();
  const firefoxAppPath = firefoxApplication?.path ?? "/Applications/Firefox.app";
  const [tabs, setTabs] = useState<FirefoxTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function refresh() {
    setIsLoading(true);
    setError(undefined);
    try {
      setTabs(await loadFirefoxTabs());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const profiles = [...new Map(tabs.map((tab) => [tab.profile.id, tab.profile])).values()];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs across Firefox profiles…"
      filtering={{ keepSectionOrder: true }}
    >
      {!isLoading && (error || tabs.length === 0) ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.AppWindowList}
          title={error ? "Could Not Read Firefox Tabs" : "No Firefox Tabs Found"}
          description={error ?? "Open a tab in Firefox, then refresh this command."}
          actions={
            <ActionPanel>
              <Action title="Refresh Tabs" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        profiles.map((profile) => (
          <List.Section
            key={profile.id}
            title={profile.name}
            subtitle={`${tabs.filter((tab) => tab.profile.id === profile.id).length}`}
          >
            {tabs
              .filter((tab) => tab.profile.id === profile.id)
              .map((tab) => (
                <List.Item
                  key={tab.id}
                  icon={Icon.Globe}
                  title={tab.title}
                  subtitle={hostname(tab.url)}
                  keywords={[tab.url, tab.profile.name]}
                  accessories={[...(tab.pinned ? [{ icon: Icon.Pin }] : []), { tag: tab.profile.name }]}
                  actions={
                    <ActionPanel>
                      <Action title="Open Tab" icon={Icon.ArrowRight} onAction={() => openTab(tab, firefoxAppPath)} />
                      <Action
                        title="Copy URL"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onAction={() => Clipboard.copy(tab.url)}
                      />
                      <Action.Open title="Open Profile Folder" icon={Icon.Folder} target={tab.profile.profilePath} />
                      <Action title="Refresh Tabs" icon={Icon.ArrowClockwise} onAction={refresh} />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
