import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { homedir } from "node:os";
import { defaultTheme, getRecents, listPreviews, removeRecent, startPreview, stopPreview } from "./lib/previews";
import type { Preview } from "./lib/previews";

const home = homedir();
const short = (path: string) => (path.startsWith(home) ? `~${path.slice(home.length)}` : path);

async function load() {
  const running = listPreviews();
  const recents = (await getRecents()).filter((recent) => !running.some((preview) => preview.root === recent.root));
  return { running, recents };
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(load);

  const stop = async (previews: Preview[]) => {
    previews.forEach(stopPreview);
    await showToast({
      style: Toast.Style.Success,
      title: previews.length === 1 ? "Stopped the preview" : `Stopped ${previews.length} previews`,
    });
    revalidate();
  };

  const preview = async (root: string, file?: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${basename(root)}` });
    try {
      const started = await startPreview(file ? `${root}/${file}` : root, await defaultTheme());
      await open(started.url);
      toast.hide();
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "comarkserv did not start" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter the previews">
      <List.EmptyView
        icon={Icon.Document}
        title="No previews"
        description="Select a markdown file or a folder in Finder, and run Preview Markdown."
      />
      <List.Section title="Running">
        {data?.running.map((item) => (
          <List.Item
            key={item.key}
            icon={{ source: Icon.CircleFilled, tintColor: "#3fb950" }}
            title={basename(item.root)}
            subtitle={short(item.root)}
            accessories={[{ text: item.url }, ...(item.theme && item.theme !== "github" ? [{ tag: item.theme }] : [])]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
                <Action.ShowInFinder path={item.root} />
                <Action
                  title="Stop Preview"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => stop([item])}
                />
                <Action
                  title="Stop All Previews"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={() => stop(data.running)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Recent">
        {data?.recents.map((recent) => (
          <List.Item
            key={recent.root}
            icon={Icon.Folder}
            title={basename(recent.root)}
            subtitle={short(recent.root)}
            accessories={[{ date: new Date(recent.time) }]}
            actions={
              <ActionPanel>
                <Action title="Preview" icon={Icon.Globe} onAction={() => preview(recent.root, recent.file)} />
                <Action.ShowInFinder path={recent.root} />
                <Action
                  title="Remove from Recent"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await removeRecent(recent.root);
                    revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
