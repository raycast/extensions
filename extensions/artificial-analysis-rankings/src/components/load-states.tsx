import { Action, ActionPanel, Icon, Keyboard, openExtensionPreferences, type Image } from "@raycast/api";
import type { JSX } from "react";
import { describeLoadError } from "../hooks/use-leaderboard";
import type { RankingsData } from "../hooks/use-rankings";
import { API_KEY_URL } from "../lib/api";
import { ModelActions } from "./model-actions";

export interface EmptyState {
  title: string;
  description: string;
  icon: Image.ImageLike;
  actions: JSX.Element;
}

/** The empty view while no rankings are available: still loading, or why loading failed and what to do. */
export function unavailableState(data: RankingsData): EmptyState {
  const actions = <ModelActions data={data} />;
  if (!data.error) {
    return {
      title: "Loading Rankings…",
      description: "Fetching the latest data from Artificial Analysis.",
      icon: Icon.Hourglass,
      actions,
    };
  }
  const description = describeLoadError(data.error);
  switch (data.error.kind) {
    case "authentication":
    case "forbidden":
      return { title: "Check Your API Key", description, icon: Icon.Key, actions: <ApiKeyActions data={data} /> };
    case "rate-limit":
      return { title: "Request Limit Reached", description, icon: Icon.Clock, actions };
    case "network":
    case "timeout":
      return { title: "Can’t Reach Artificial Analysis", description, icon: Icon.WifiDisabled, actions };
    default:
      return { title: "Couldn’t Load Rankings", description, icon: Icon.Warning, actions };
  }
}

function ApiKeyActions({ data }: { data: RankingsData }) {
  return (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Get a Free API Key" url={API_KEY_URL} />
      <Action
        title="Refresh Rankings"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => data.refresh()}
      />
    </ActionPanel>
  );
}
