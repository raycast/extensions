import {
  ActionPanel,
  Action,
  Detail,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageLike,
  useNavigation,
  Navigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { BranchesList } from "./branches";

export default function AppList() {
  const [state, setState] = useState<{ apps: App[] }>({ apps: [] });

  useEffect(() => {
    async function fetch() {
      const apps = await fetchApps();
      setState((oldState) => ({
        ...oldState,
        apps: apps,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.apps.length === 0} searchBarPlaceholder="Filter apps by name...">
      {state.apps.map((app) => (
        <AppListItem key={app.slug} app={app} />
      ))}
    </List>
  );
}

function AppListItem(props: { app: App }) {
  const app = props.app;

  return (
    <List.Item
      id={app.slug}
      key={app.slug}
      title={app.title}
      subtitle=""
      icon={app.avatar_url}
      actions={
        <ActionPanel>
          <Action.Push title="Select Project" target={<BranchesList appSlug={app.slug} />} />
        </ActionPanel>
      }
    />
  );
}

async function fetchApps(): Promise<App[]> {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const response = await fetch("https://api.bitrise.io/v0.1/apps", {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });
    const json = await response.json();
    return (json as Record<string, unknown>).data as App[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load apps due to ${error}`);
    return Promise.resolve([]);
  }
}

interface Preferences {
  apiKey: string;
}

type App = {
  title: string;
  slug: string;
  avatar_url: string;
};
