import { Action, ActionPanel, Application, Clipboard, getPreferenceValues } from "@raycast/api";
import { ListItemProps } from "./open";

const customApps: Application[] = [];
const preferences = getPreferenceValues<Preferences>();

for (let i = 1; i <= 10; i++) {
  const appKey = `customApp${i}` as keyof Preferences;
  const app = preferences[appKey];
  if (app) {
    customApps.push(app);
  }
}

const createActionForApp = (app: Application, path: string, openPath: (path: string, app: Application) => void) => (
  <Action key={app.bundleId} title={"Open with " + app.name} onAction={() => openPath(path, app)} />
);

const createCopyAction = (path: string) => (
  <Action
    key="copy"
    title="Copy to Clipboard"
    shortcut={{ modifiers: ["ctrl"], key: "c" }}
    onAction={() => Clipboard.copy(path)}
  />
);

export const AppActionPanel = ({ path, openPath }: ListItemProps) => (
  <ActionPanel>
    {customApps.map((app) => createActionForApp(app, path, openPath))}
    {createCopyAction(path)}
  </ActionPanel>
);
