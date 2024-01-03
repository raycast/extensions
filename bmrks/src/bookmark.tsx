import * as React from "react";
import { runAppleScript, getFavicon } from "@raycast/utils";
import { Action, ActionPanel, Detail, Form, PopToRootType, openExtensionPreferences, showHUD } from "@raycast/api";
import { useUser } from "@supabase/auth-helpers-react";
import { useAuth } from "./use-auth";
import { useGroups } from "./use-groups";
import * as db from "./db";

export default function Bookmark() {
  const [activeGroupId, setActiveGroupId] = React.useState<string | undefined>();

  const user = useUser();
  const authError = useAuth();
  const activeTab = useActiveTab();
  const groups = useGroups();

  const activeGroup = React.useMemo(() => {
    return groups.find((group) => group.id === activeGroupId);
  }, [groups, activeGroupId]);

  if (authError) {
    const markdown =
      authError === "Invalid login credentials"
        ? authError + ". Please open the preferences and try again."
        : authError;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  async function onSubmit({ groupId, url, title }: { groupId: string; url: string; title: string }) {
    if (!activeTab) {
      await showHUD("No active tab found");
      return;
    }

    const res = await db.insertBookmark({
      type: "link",
      url,
      title,
      favicon_url: activeTab.faviconUrl,
      group_id: groupId,
    });

    if (res.error) {
      await showHUD(res.error.message);
      return;
    }

    await showHUD(`Saved to ${activeGroup!.name}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  return (
    <Form
      isLoading={!groups.length}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={onSubmit} />
          {activeGroup && user && (
            <Action.OpenInBrowser
              url={`https://bmrks.com/${user.app_metadata["username"]}/${activeGroup.name.toLowerCase()}`}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="groupId" title="Group" onChange={setActiveGroupId}>
        {groups.map((group) => (
          <Form.Dropdown.Item key={group.id} value={group.id} title={group.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="url" title="URL" value={activeTab?.url} />
      <Form.TextField id="title" title="Title" value={activeTab?.title} />
      <Form.Dropdown id="faviconUrl" title="Icon">
        <Form.Dropdown.Item
          key={activeTab?.faviconUrl}
          value={activeTab?.faviconUrl || ""}
          title={activeTab?.faviconUrl || ""}
          icon={
            activeTab?.faviconUrl
              ? {
                  source: activeTab?.faviconUrl,
                }
              : undefined
          }
        />
      </Form.Dropdown>
    </Form>
  );
}

/////////////////////////////////////////////////////////////////////////////////////////

type ActiveTab = {
  url: string;
  title: string;
  faviconUrl: string;
};

function useActiveTab() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab | null>(null);

  React.useEffect(() => {
    (async () => {
      const activeWindow = await getActiveWindow();

      if (!supportedBrowsers.some((browser) => browser === activeWindow)) {
        return;
      }

      const activeTab = await getActiveTabByBrowser[activeWindow as Browser]();

      if (!activeTab) {
        return;
      }

      const { url, title } = extractUrlAndTitle(activeTab);
      const favicon = await getFavicon(url);

      setActiveTab({
        url,
        title,
        // @ts-expect-error -- This seems to work fine
        faviconUrl: favicon.source ?? "",
      });
    })();
  }, []);

  return activeTab;
}

/////////////////////////////////////////////////////////////////////////////////////////

type Browser = "Google Chrome" | "Safari" | "firefox" | "Brave Browser" | "Arc";

function getActiveWindow() {
  return runAppleScript(`tell application "System Events" to get name of (processes whose frontmost is true) as text`);
}

const getActiveTabByBrowser = {
  "Google Chrome": () =>
    runAppleScript(`tell application "Google Chrome" to return {URL, title} of active tab of front window`),
  Arc: () => runAppleScript(`tell application "Arc" to return {URL, title} of active tab of front window`),
  Safari: () => runAppleScript(`tell application "Safari" to return {URL of front document, name of front document}`),
  firefox: () => {},
  "Brave Browser": () =>
    runAppleScript(`tell application "Brave Browser" to return {URL, title} of active tab of front window`),
} as const;

const supportedBrowsers = Object.keys(getActiveTabByBrowser);

function extractUrlAndTitle(string: string) {
  const commaIndex = string.indexOf(",");
  const url = string.slice(0, commaIndex).trim();
  const title = string.slice(commaIndex + 1).trim();

  return {
    url,
    title: title.trim(),
  };
}
