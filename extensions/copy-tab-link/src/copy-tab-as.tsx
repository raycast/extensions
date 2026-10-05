import { Action, ActionPanel, Clipboard, Icon, List, openExtensionPreferences, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { NoTabError, getActiveTab, getAllTabs } from "./lib/browsers";
import { CleanTab, toCleanTab } from "./lib/clean";
import { FORMATS } from "./lib/formats";
import { Mode, deliver, renderTabList, toPayload } from "./lib/run";
import { getSettings } from "./lib/settings";

export default function Command() {
  const settings = useMemo(() => getSettings(), []);
  const [tab, setTab] = useState<CleanTab | undefined>();
  const [source, setSource] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveTab({
          browserSource: settings.browserSource,
          preferredBrowser: settings.preferredBrowser,
        });
        if (cancelled) return;
        setTab(toCleanTab(active.url, active.title, settings.clean));
        setSource(active.source);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof NoTabError ? caught.message : String(caught));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings]);

  async function copyAllTabs() {
    try {
      const tabs = await getAllTabs({
        browserSource: settings.browserSource,
        preferredBrowser: settings.preferredBrowser,
      });
      await Clipboard.copy(renderTabList(tabs, settings));
      await showHUD(`Copied ${tabs.length} ${tabs.length === 1 ? "tab" : "tabs"}`);
    } catch (caught) {
      await showFailureToast(caught, { title: "Could not read the browser window" });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No browser tab found"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search formats…">
      {tab &&
        FORMATS.map((format) => {
          const payload = toPayload(format.id, tab, settings);
          const run = (mode: Mode) => () => deliver(payload, mode, format.title, settings);

          // Rich text has no meaningful source code to show: what matters is
          // that the title stays visible and the link hides behind it.
          const markdown = format.rich
            ? [
                `## [${tab.title.replace(/([[\]])/g, "\\$1")}](${tab.url})`,
                "",
                "Arrives as formatted text, so the title stays readable and the address sits behind it.",
                "Paste it into Teams, Outlook, Word or any other rich text field.",
              ].join("\n")
            : ["```", payload.preview, "```"].join("\n");

          return (
            <List.Item
              key={format.id}
              title={format.title}
              subtitle={format.hint}
              icon={format.rich ? Icon.Text : Icon.Clipboard}
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={tab.title} />
                      <List.Item.Detail.Metadata.Label title="URL" text={tab.url} />
                      {source ? <List.Item.Detail.Metadata.Label title="Source" text={source} /> : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {settings.defaultAction === "paste" ? (
                    <>
                      <Action title="Paste" icon={Icon.Text} onAction={run("paste")} />
                      <Action title="Copy" icon={Icon.Clipboard} onAction={run("copy")} />
                    </>
                  ) : (
                    <>
                      <Action title="Copy" icon={Icon.Clipboard} onAction={run("copy")} />
                      <Action title="Paste" icon={Icon.Text} onAction={run("paste")} />
                    </>
                  )}
                  <Action
                    title="Copy All Tabs of This Window"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={copyAllTabs}
                  />
                  <Action.OpenInBrowser title="Open the Tab URL" url={tab.url} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
