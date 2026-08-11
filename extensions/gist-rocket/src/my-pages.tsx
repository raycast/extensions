import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { GistSummary, deletePage, listMyPages, withGitHub } from "./lib/github";
import { afterPublish, republish } from "./lib/publish";
import { hostedUrl } from "./lib/host";
import { detectKind } from "./lib/html";
import { Theme } from "./lib/render";
import { UpdateFromFile } from "./components/update-from-file";
import { RenamePage } from "./components/rename-page";

function MyPages() {
  const prefs = getPreferenceValues<Preferences>();
  const theme = (prefs.defaultMarkdownTheme as Theme) ?? "light";
  const { data, isLoading, revalidate } = useCachedPromise(listMyPages, [], { initialData: [] as GistSummary[] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your pages…">
      {data.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Rocket}
          title="No pages yet"
          description="Run “Publish Page” to publish your first page."
        />
      ) : null}
      {data.map((g) => (
        <List.Item
          key={g.id}
          title={g.description || "(untitled)"}
          subtitle={g.id}
          accessories={[
            { tag: { value: g.isPublic ? "Public" : "Secret", color: g.isPublic ? Color.Green : Color.SecondaryText } },
            { date: new Date(g.updatedAt), tooltip: `Updated ${new Date(g.updatedAt).toLocaleString()}` },
          ]}
          icon={g.hasSourceMarkdown ? Icon.Document : Icon.Code}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open Page" url={hostedUrl(g.id)} icon={Icon.Globe} />
                <Action.CopyToClipboard
                  title="Copy Page URL"
                  content={hostedUrl(g.id)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open Gist on GitHub"
                  url={`https://gist.github.com/${g.id}`}
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Update from Clipboard"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={() => updateFromClipboard(g, theme, revalidate)}
                />
                <Action.Push
                  title="Update from File…"
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  target={
                    <UpdateFromFile
                      gistId={g.id}
                      currentDescription={g.description}
                      previousFiles={g.files.map((f) => f.filename)}
                      onDone={revalidate}
                    />
                  }
                />
                <Action.Push
                  title="Rename…"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  target={<RenamePage gistId={g.id} currentDescription={g.description} onDone={revalidate} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Page"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteWithConfirm(g, revalidate)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function updateFromClipboard(g: GistSummary, theme: Theme, revalidate: () => void) {
  const text = await Clipboard.readText();
  if (!text || !text.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating from clipboard…" });
  try {
    const kind = detectKind(text);
    const result = await republish(
      g.id,
      {
        kind,
        source: text,
        description: g.description,
        visibility: g.isPublic ? "public" : "secret",
        theme,
      },
      { previousFiles: g.files.map((f) => f.filename) },
    );
    await toast.hide();
    await afterPublish(result, "Page updated");
    revalidate();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Update failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function deleteWithConfirm(g: GistSummary, revalidate: () => void) {
  const ok = await confirmAlert({
    title: "Delete page?",
    message: `“${g.description || g.id}” will be permanently deleted.`,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
  try {
    await deletePage(g.id);
    await toast.hide();
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
    revalidate();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Delete failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export default withGitHub(MyPages);
