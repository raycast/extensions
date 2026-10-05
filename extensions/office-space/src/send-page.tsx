import { Action, ActionPanel, BrowserExtension, Detail, environment, Icon, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SendForm } from "./components/SendForm";
import { linkTo } from "./lib/format";

async function currentPage() {
  const tabs = await BrowserExtension.getTabs();
  const tab = tabs.find((candidate) => candidate.active) ?? tabs[0];
  if (!tab) throw new Error("No browser tab found.");
  let content: string | undefined;
  try {
    content = await BrowserExtension.getContent({ format: "markdown", tabId: tab.id });
  } catch {
    content = undefined; // e.g. a browser page the extension can't read
  }
  return { url: tab.url, title: tab.title, content };
}

export default function Command() {
  const { data, isLoading, error } = usePromise(currentPage);
  if (isLoading) return <Detail isLoading markdown="" />;
  if (error || !data) {
    const noExtension = !environment.canAccess(BrowserExtension);
    return (
      <Detail
        markdown={
          noExtension
            ? "## Raycast's browser extension is needed\n\nInstall it for your browser to send the page's content. Or use Office Space's own ⌃⌥O, which sends the page's URL and title."
            : `## Couldn't read the browser tab\n\n${error?.message ?? ""}`
        }
        actions={
          <ActionPanel>
            <Action
              title="Use Office Space's Send Page Panel"
              icon={Icon.Globe}
              onAction={() => open(linkTo("send-page"))}
            />
          </ActionPanel>
        }
      />
    );
  }
  return <SendForm payload={{ kind: "Send Page to Agent", url: data.url, title: data.title, content: data.content }} />;
}
