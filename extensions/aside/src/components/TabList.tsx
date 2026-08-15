import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import { closeTab, focusTab, getTabUrl, reloadTab } from "../lib/browser";
import { AsideTab, TabActionKind } from "../types";
import { BrowserErrorView } from "./BrowserErrorView";
import { AsideCompatibilityNotice } from "./AsideCompatibilityNotice";
import { useTabs } from "../hooks/use-tabs";

function favicon(url: string): Image.ImageLike {
  try {
    return url ? getFavicon(url, { mask: Image.Mask.Circle }) : Icon.Globe;
  } catch {
    return Icon.Globe;
  }
}

function subtitle(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

function actionTitle(kind: TabActionKind) {
  return { focus: "Focus Tab", close: "Close Tab", reload: "Reload Tab", copy: "Copy Tab URL" }[kind];
}

function TabAction({ kind, tab, revalidate }: { kind: TabActionKind; tab: AsideTab; revalidate: () => void }) {
  const shortcuts: Partial<Record<TabActionKind, Keyboard.Shortcut>> = {
    close: { modifiers: ["cmd", "shift"], key: "w" },
    reload: { modifiers: ["cmd", "shift"], key: "r" },
    copy: Keyboard.Shortcut.Common.Copy,
  };
  const icons = { focus: Icon.ArrowRight, close: Icon.XMarkCircle, reload: Icon.ArrowClockwise, copy: Icon.Clipboard };

  return (
    <Action
      title={actionTitle(kind)}
      icon={icons[kind]}
      shortcut={shortcuts[kind]}
      onAction={async () => {
        try {
          if (kind === "focus") {
            await focusTab(tab);
            await closeMainWindow();
            return;
          }
          if (kind === "close") {
            await closeTab(tab);
            await showToast({ style: Toast.Style.Success, title: "Closed tab" });
            revalidate();
            return;
          }
          if (kind === "reload") {
            await reloadTab(tab);
            await showToast({ style: Toast.Style.Success, title: "Reloaded tab" });
            revalidate();
            return;
          }
          const result = await getTabUrl(tab);
          await Clipboard.copy(result.url ?? tab.url);
          await showToast({ style: Toast.Style.Success, title: "Copied tab URL" });
        } catch (error) {
          await showFailureToast(error, { title: `Failed to ${kind} tab` });
          revalidate();
        }
      }}
    />
  );
}

function TabActions({ primary, tab, revalidate }: { primary: TabActionKind; tab: AsideTab; revalidate: () => void }) {
  const order: TabActionKind[] = [
    primary,
    ...(["focus", "reload", "copy", "close"] as TabActionKind[]).filter((a) => a !== primary),
  ];
  return (
    <ActionPanel title={tab.title || "Untitled Tab"}>
      {order.map((kind) => (
        <ActionPanel.Section key={kind}>
          <TabAction kind={kind} tab={tab} revalidate={revalidate} />
        </ActionPanel.Section>
      ))}
      <ActionPanel.Section title="Copy and Save">
        <Action.CopyToClipboard title="Copy Tab Title" content={tab.title || "Untitled Tab"} icon={Icon.Text} />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${tab.title || "Untitled Tab"}](${tab.url})`}
          icon={Icon.Link}
        />
        <Action.CreateQuicklink
          quicklink={{ name: tab.title || "Aside Tab", link: tab.url, application: "Aside" }}
          shortcut={Keyboard.Shortcut.Common.Save}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh Tabs"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function TabList({ primaryAction }: { primaryAction: TabActionKind }) {
  const { data, error, isLoading, revalidate } = useTabs();

  if (error) return <BrowserErrorView error={error} onRetry={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tab titles and URLs…">
      <AsideCompatibilityNotice />
      {data?.map((tab) => (
        <List.Item
          key={`${tab.windowId}:${tab.id}`}
          title={tab.title || "Untitled Tab"}
          subtitle={{ value: subtitle(tab.url), tooltip: tab.url }}
          keywords={[tab.url, tab.windowMode]}
          icon={favicon(tab.url)}
          accessories={[
            ...(tab.active ? [{ icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "Active tab" }] : []),
            ...(tab.loading ? [{ text: "Loading…" }] : []),
            ...(tab.windowMode === "incognito" ? [{ icon: Icon.Lock, tooltip: "Incognito window" }] : []),
            { text: `Window ${tab.windowIndex}` },
          ]}
          actions={<TabActions primary={primaryAction} tab={tab} revalidate={revalidate} />}
        />
      ))}
      {!isLoading && !data?.length ? (
        <List.EmptyView
          icon={Icon.AppWindowList}
          title="No Aside tabs found"
          description="Open a tab in Aside, then try again."
        />
      ) : null}
    </List>
  );
}
