import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { FetchError } from "node-fetch";
import { AuthorizationError, UnknownServerError } from "./gitlab/common";
import { NoProjectsError } from "./MyDashboard";

interface Preferences {
  gitlabInstance: string;
}
const preferences = getPreferenceValues<Preferences>();

const openPreferences = (
  <ActionPanel>
    <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.AppWindow} />
  </ActionPanel>
);

export function ErrorView(props: { error: Error }) {
  if (props.error instanceof AuthorizationError) {
    return authError;
  } else if (props.error.name === "FetchError" && (props.error as FetchError).code === "ENOTFOUND") {
    return connectionError;
  } else if (props.error instanceof UnknownServerError) {
    return unknownError;
  } else if (props.error instanceof NoProjectsError) {
    return noProjectsError;
  }
}

const authError = (
  <List.EmptyView
    title="Authorization error"
    description="Please check your access token in the preferences"
    icon="../assets/padlock.png"
    actions={openPreferences}
  />
);

const connectionError = (
  <List.EmptyView
    title="Connection error"
    description={`Unable to connect to ${preferences.gitlabInstance}`}
    icon="../assets/unplug.png"
    actions={openPreferences}
  />
);

const unknownError = (
  <List.EmptyView
    title="Uh-oh! Looks like things got a bit wonky"
    description="Give it another shot by hitting ⌘R"
    icon="../assets/unicorn.png"
  />
);

const noProjectsError = (
  <List.EmptyView
    title="No projects selected"
    description="Open the `Select my projects` command to pick your favourites"
    icon="../assets/no-projects.png"
  />
);
