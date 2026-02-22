import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
  getPreferenceValues,
  open,
  Application,
} from "@raycast/api";
import * as os from "os";
import { Repo, scanRepos } from "./utils";

async function openRepo(repoPath: string, app: Application) {
  try {
    await open(repoPath, app);
    await popToRoot();
    await closeMainWindow();
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open", message: String(err) });
  }
}

function EditorList({ repo, editors }: { repo: Repo; editors: Application[] }) {
  return (
    <List navigationTitle={`Open "${repo.name}" in…`} searchBarPlaceholder="Search editors...">
      {editors.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          actions={
            <ActionPanel>
              <Action title={`Open in ${app.name}`} onAction={() => openRepo(repo.fullPath, app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.OpenRepo>();
  const dirs = prefs.projectDirectories.split(",").filter(Boolean);
  const repos = scanRepos(dirs);

  // An optional appPicker with nothing selected comes back as an object with an empty name
  const editors = [prefs.editor1, prefs.editor2, prefs.editor3, prefs.editor4, prefs.editor5].filter(
    (app): app is Application => !!app?.name,
  );

  const emptyTitle = dirs.length === 0 ? "No Directories Configured" : "No Repositories Found";
  const emptyDescription =
    dirs.length === 0
      ? "Add at least one directory in the extension preferences."
      : "Make sure the configured directories exist and contain git repositories.";

  return (
    <List searchBarPlaceholder="Search repositories...">
      <List.EmptyView title={emptyTitle} description={emptyDescription} />
      {repos.map((repo) => (
        <List.Item
          key={repo.fullPath}
          title={repo.name}
          accessories={[{ text: repo.fullPath.replace(os.homedir(), "~") }]}
          actions={
            <ActionPanel>
              {editors.length === 1 ? (
                <Action title={`Open in ${editors[0].name}`} onAction={() => openRepo(repo.fullPath, editors[0])} />
              ) : (
                <Action.Push title="Select Editor…" target={<EditorList repo={repo} editors={editors} />} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
