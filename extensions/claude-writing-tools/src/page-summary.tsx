import { Action, ActionPanel, BrowserExtension, environment, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Chat } from "./components/Chat";
import { defaultRequest } from "./lib/prompts";
import { settings } from "./lib/settings";

/** Long pages are cut so one summary stays affordable; the attachment label says so. */
const PAGE_LIMIT = 150_000;

async function readPage() {
  const tabs = await BrowserExtension.getTabs();
  const tab = tabs.find((t) => t.active);
  const content = (await BrowserExtension.getContent({ format: "markdown", tabId: tab?.id })).trim();
  if (!content) throw new Error("No readable text was found on the page.");
  return {
    title: tab?.title || (tab?.url ? new URL(tab.url).hostname : "Web page"),
    url: tab?.url ?? "",
    text: content.slice(0, PAGE_LIMIT),
    truncated: content.length > PAGE_LIMIT,
  };
}

export default function Command() {
  const canAccess = environment.canAccess(BrowserExtension);
  const { data, isLoading, error } = usePromise(readPage, [], { execute: canAccess });

  if (!canAccess) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="Raycast Browser Extension Required"
          description="Install Raycast's browser extension so the current tab can be read."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Install Browser Extension" url="https://www.raycast.com/browser-extension" />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (isLoading) return <List isLoading searchBarPlaceholder="Reading page…" />;
  if (error || !data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Couldn't read the page" description={error?.message} />
      </List>
    );
  }
  const request = defaultRequest("page", settings().langs);
  return (
    <Chat
      seed={{
        prompt: request.prompt,
        instruction: request.instruction,
        attachments: [{ kind: "page", ...data }],
        send: true,
      }}
    />
  );
}
