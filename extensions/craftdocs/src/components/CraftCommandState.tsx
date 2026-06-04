import { Action, ActionPanel, Form, List, openExtensionPreferences } from "@raycast/api";
import { CraftCommandEnvironment } from "../hooks/useCraftEnvironment";
import { DatabaseLoadIssue } from "../lib/databaseLoader";

type CommandStateCopy = {
  title: string;
  description: string;
  showPreferencesAction?: boolean;
};

const errorEnvironmentState: CraftCommandEnvironment = {
  status: "error",
  message: "Could not inspect installed Craft applications.",
};

export const CraftEnvironmentList = ({ environment }: { environment: CraftCommandEnvironment | null }) => {
  const copy = getEnvironmentCopy(environment || errorEnvironmentState);

  return (
    <List>
      <List.EmptyView
        title={copy.title}
        description={copy.description}
        icon="command-icon-small.png"
        actions={copy.showPreferencesAction ? <PreferencesActionPanel /> : undefined}
      />
    </List>
  );
};

export const CraftEnvironmentForm = ({ environment }: { environment: CraftCommandEnvironment | null }) => {
  const copy = getEnvironmentCopy(environment || errorEnvironmentState);

  return (
    <Form actions={copy.showPreferencesAction ? <PreferencesActionPanel /> : undefined}>
      <Form.Description title={copy.title} text={copy.description} />
    </Form>
  );
};

export const DatabaseIssueList = ({ issue }: { issue: DatabaseLoadIssue }) => {
  const copy = getDatabaseIssueCopy(issue);

  return (
    <List>
      <List.EmptyView title={copy.title} description={copy.description} icon="command-icon-small.png" />
    </List>
  );
};

export const DatabaseIssueForm = ({ issue }: { issue: DatabaseLoadIssue }) => {
  const copy = getDatabaseIssueCopy(issue);

  return (
    <Form>
      <Form.Description title={copy.title} text={copy.description} />
    </Form>
  );
};

const PreferencesActionPanel = () => (
  <ActionPanel>
    <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
  </ActionPanel>
);

const getEnvironmentCopy = (environment: CraftCommandEnvironment): CommandStateCopy => {
  switch (environment.status) {
    case "missing-app":
      return {
        title: "Craft not found",
        description: "Install Craft or choose a valid Craft app in extension preferences.",
        showPreferencesAction: true,
      };
    case "invalid-selection":
      return {
        title:
          environment.reason === "unsupported-application"
            ? "Selected app is not Craft"
            : "Selected Craft app not found",
        description:
          environment.reason === "unsupported-application"
            ? "Choose either Craft or Craft via Setapp in extension preferences."
            : "Choose an installed Craft app in extension preferences.",
        showPreferencesAction: true,
      };
    case "missing-data-root":
      return {
        title: "Craft data not initialized",
        description: "Open the selected Craft app once so it can create its local data directory.",
      };
    case "missing-search-index":
      return {
        title: "Craft search index not found",
        description: "Open Craft and let it finish syncing before using this command.",
      };
    case "error":
      return {
        title: "Could not inspect Craft",
        description: environment.message,
      };
    case "ready":
      return {
        title: "Craft ready",
        description: "Craft is ready.",
      };
  }
};

const getDatabaseIssueCopy = (issue: DatabaseLoadIssue): CommandStateCopy => {
  switch (issue.code) {
    case "missing-wasm":
      return {
        title: "Craft search unavailable",
        description: "The bundled Craft search asset is missing in this extension build.",
      };
    case "missing-sqlite":
      return {
        title: "Craft search data unavailable",
        description: "No readable Craft search databases were found.",
      };
    case "load-failed":
      return {
        title: "Craft search failed to load",
        description: "The local Craft search database could not be opened.",
      };
  }
};
