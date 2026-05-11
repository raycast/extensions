import { ActionPanel, List, Action, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Category {
  name: string;
  url: string;
}

interface AppIcon {
  small: string;
  medium: string;
  large: string;
}

interface App {
  name: string;
  subtitle: string;
  featured_at: string;
  url: string;
  categories: Category[];
  icon: AppIcon;
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

  // Use useState to manage the apps state based on fetched data
  const [apps, setApps] = useState<App[]>([]);

  // Update apps state when data changes
  useEffect(() => {
    if (data) {
      setApps(data);
    }
  }, [data]);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const filterAppsByDate = (apps: App[], date: Date) =>
    apps?.filter((app) => formatDate(new Date(app.featured_at)) === formatDate(date)) || [];

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const appsToday = filterAppsByDate(apps, today);
  const appsYesterday = filterAppsByDate(apps, yesterday);
  const appsEarlier = apps?.filter((app) => formatDate(new Date(app.featured_at)) < formatDate(yesterday)) || [];

  return (
    <List isLoading={isLoading}>
      <List.Section title="Today">
        {appsToday.map((app, index) => (
          <AppListItem key={index} app={app} />
        ))}
      </List.Section>
      <List.Section title="Yesterday">
        {appsYesterday.map((app, index) => (
          <AppListItem key={index} app={app} />
        ))}
      </List.Section>
      <List.Section title="Earlier">
        {appsEarlier.map((app, index) => (
          <AppListItem key={index} app={app} />
        ))}
      </List.Section>
    </List>
  );
}

function AppListItem({ app }: { app: App }) {
  return (
    <List.Item
      icon={{
        source: app.icon.small,
        fallback: "circle-progress.png",
        mask: Image.Mask.RoundedRectangle,
      }}
      title={app.name ?? "No name"}
      subtitle={app.subtitle ?? ""}
      accessories={app.categories.length > 0 ? [{ text: app.categories[0].name }] : []}
      actions={
        <ActionPanel title={app.name}>
          <Action.OpenInBrowser url={app.url} title="Open in Browser" />
          <Action.CopyToClipboard content={app.url} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
