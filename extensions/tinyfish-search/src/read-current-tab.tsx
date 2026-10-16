import { Action, ActionPanel, BrowserExtension, Detail, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FetchedPages } from "./components/fetched-pages";
import { FetchPagesForm } from "./components/fetch-pages-form";
import { parseURLInput } from "./content";

export default function ReadCurrentTab() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const tabs = (await BrowserExtension.getTabs()).filter((tab) => tab.active);
    if (!tabs.length)
      throw new Error("No active browser tab was found. Open a webpage in a browser connected to Raycast.");
    return tabs;
  });
  if (data?.length === 1) {
    const tab = data[0];
    try {
      parseURLInput(tab.url);
    } catch {
      return <FetchPagesForm initialURL={tab.url} />;
    }
    return <FetchedPages options={{ urls: [tab.url], links: true }} />;
  }
  if (data && data.length > 1)
    return (
      <List navigationTitle="Choose Active Tab" searchBarPlaceholder="Multiple browser windows are open…">
        {data.map((tab) => (
          <List.Item
            key={tab.id}
            title={tab.title || tab.url}
            subtitle={tab.url}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.Push title="Read Page" icon={Icon.Document} target={<FetchPagesForm initialURL={tab.url} />} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Could not read the current tab\n\n${error.message}\n\nThis command uses the Raycast browser extension. You can also enter a URL manually.`
          : "# Reading current tab…"
      }
      actions={
        <ActionPanel>
          {error ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} /> : null}
          <Action.Push title="Enter URL" icon={Icon.Link} target={<FetchPagesForm />} />
        </ActionPanel>
      }
    />
  );
}
