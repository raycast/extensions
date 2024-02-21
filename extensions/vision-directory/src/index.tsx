import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Category {
  name: string;
  url: string;
}

interface App {
  name: string;
  subtitle: string;
  date: string;
  url: string;
  categories: Category[];
}

export default function Command() {
  const { data, isLoading } = useFetch<App[]>("https://vision.directory/api/v1/apps.json", {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const apps = await response.json();
      return apps;
    },
  });

  return (
    <List isLoading={isLoading}>
      <List.EmptyView icon="no-view.png" title="No Results" />
      {data?.map((app, index) => <AppListItem key={index} app={app} />)}
    </List>
  );
}

function AppListItem(props: { app: App }) {
  const { app } = props;

  return (
    <List.Item
      title={app.name ?? "No name"}
      subtitle={app.subtitle ?? "No subtitle"}
      // accessories={[{ text: useRelativeTime(new Date(app.featured_at)) }]}
      actions={
        <ActionPanel title={app.name}>
          <ActionPanel.Section>
            {app.url && <Action.OpenInBrowser url={app.url} />}
            {app.url && (
              <Action.CopyToClipboard content={app.url} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
