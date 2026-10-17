import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface App {
  id: string;
  name: string;
  icon: string;
  categories: string;
  description: string;
  status: string;
  platform: string;
}

interface Apps {
  all: App[];
  featured: any[];
  popular: any[];
  new: any[];
  upcoming: any[];
  waitlist: any[];
}
interface Response {
  apps: Apps;
  categories: any[];
  sections: any[];
}

export default function AppList() {
  const [state, setState] = useState<{
    all: App[] | any;
    popular: string[] | any;
    featured: string[] | any;
    new: string[] | any;
    upcoming: string[] | any;
    waitlist: string[] | any;
  }>({ all: [], popular: [], featured: [], new: [], upcoming: [], waitlist: [] });

  useEffect(() => {
    async function fetch() {
      const appsResponse = await fetchApps();
      setState((oldState) => ({
        ...oldState,
        all: appsResponse?.apps.all.filter(
          (app) =>
            !appsResponse?.apps.popular.includes(app.id) &&
            !appsResponse?.apps.featured.includes(app.id) &&
            !appsResponse?.apps.new.includes(app.id) &&
            !appsResponse?.apps.upcoming.includes(app.id) &&
            !appsResponse?.apps.waitlist.includes(app.id),
        ),
        popular: appsResponse?.apps.all.filter((app) => appsResponse?.apps.popular.includes(app.id)),
        featured: appsResponse?.apps.all.filter((app) => appsResponse?.apps.featured.includes(app.id)),
        new: appsResponse?.apps.all.filter(
          (app) =>
            !appsResponse?.apps.popular.includes(app.id) &&
            !appsResponse?.apps.featured.includes(app.id) &&
            appsResponse?.apps.new.includes(app.id) &&
            !appsResponse?.apps.upcoming.includes(app.id) &&
            !appsResponse?.apps.waitlist.includes(app.id),
        ),
        upcoming: appsResponse?.apps.all.filter(
          (app) =>
            !appsResponse?.apps.popular.includes(app.id) &&
            !appsResponse?.apps.featured.includes(app.id) &&
            !appsResponse?.apps.new.includes(app.id) &&
            appsResponse?.apps.upcoming.includes(app.id) &&
            !appsResponse?.apps.waitlist.includes(app.id),
        ),
        waitlist: appsResponse?.apps.all.filter(
          (app) =>
            !appsResponse?.apps.popular.includes(app.id) &&
            !appsResponse?.apps.featured.includes(app.id) &&
            !appsResponse?.apps.new.includes(app.id) &&
            !appsResponse?.apps.upcoming.includes(app.id) &&
            appsResponse?.apps.waitlist.includes(app.id),
        ),
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.all.length === 0} searchBarPlaceholder="Filter apps by name...">
      <List.Section id="popular" title="Popular">
        {state.featured.map((app: App) => (
          <AppListItem key={app.id} type="featured" app={app} />
        ))}
      </List.Section>
      <List.Section id="featured" title="Featured">
        {state.popular.map((app: App) => (
          <AppListItem key={app.id} type="popular" app={app} />
        ))}
      </List.Section>
      <List.Section id="new" title="New">
        {state.new.map((app: App) => (
          <AppListItem key={app.id} type="new" app={app} />
        ))}
      </List.Section>
      <List.Section id="upcoming" title="Upcoming">
        {state.upcoming.map((app: App) => (
          <AppListItem key={app.id} type="upcoming" app={app} />
        ))}
      </List.Section>
      <List.Section id="waitlist" title="Waitlist">
        {state.waitlist.map((app: App) => (
          <AppListItem key={app.id} type="waitlist" app={app} />
        ))}
      </List.Section>
      <List.Section id="all" title="All">
        {state.all.map((app: App) => (
          <AppListItem key={app.id} type="all" app={app} />
        ))}
      </List.Section>
    </List>
  );
}

function AppListItem(props: { app: App; type: string }) {
  const { app, type } = props;

  return (
    <List.Item
      id={`${type}-${app.id}`}
      key={`${type}-${app.id}`}
      title={app.name}
      subtitle={app.description}
      icon={{ source: app.icon }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://app.airport.community/app/${app.id}`} />
          <Action.CopyToClipboard title="Copy URL" content={`https://app.airport.community/app/${app.id}`} />
        </ActionPanel>
      }
    />
  );
}

async function fetchApps(): Promise<Response | null> {
  try {
    const response = await fetch("https://app.airport.community/api/apps");
    const json: any = await response.json();
    return json as Response;
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, "Could not load apps");
    return Promise.resolve(null);
  }
}
