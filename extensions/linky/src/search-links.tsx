import { Action, ActionPanel, closeMainWindow, Color, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { DOWNLOAD_URL, isLinkyInstalled, LinkItem, linkyURL, loadLinks, sendToLinky } from "./linky";

async function load(): Promise<{ installed: boolean; links: LinkItem[] }> {
  const installed = await isLinkyInstalled();
  return { installed, links: installed ? await loadLinks() : [] };
}

/** Sends a command to Linky, then closes Raycast so the result (HUD, file, Finder) is visible. */
async function run(url: string) {
  try {
    await sendToLinky(url);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Reach Linky" });
  }
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(load);
  const links = data?.links ?? [];
  const missing = links.filter((link) => link.missing);
  const found = links.filter((link) => !link.missing);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search links by file or folder name">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could Not Load Links"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Linky" icon={Icon.Link} onAction={() => run(linkyURL("links"))} />
            </ActionPanel>
          }
        />
      ) : data && !data.installed ? (
        <List.EmptyView
          icon="linky.png"
          title="Linky is not installed"
          description="Linky is a free menu bar app that makes lasting links to files and folders."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download Linky" url={DOWNLOAD_URL} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon="linky.png"
          title="No links yet"
          description="Select a file in Finder and run Copy Linky Link."
        />
      )}

      <List.Section title="File Not Found" subtitle={missing.length > 0 ? String(missing.length) : undefined}>
        {missing.map((link) => (
          <List.Item
            key={link.id}
            title={link.name}
            subtitle={`Last seen in ${link.folder}`}
            keywords={link.folder.split("/")}
            icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            accessories={[{ tag: { value: "Missing", color: Color.Orange } }]}
            actions={
              <ActionPanel>
                <Action title="Relink in Linky" icon={Icon.Link} onAction={() => run(linkyURL("links"))} />
                <Action.CopyToClipboard title="Copy Last Known Path" content={link.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Links" subtitle={found.length > 0 ? String(found.length) : undefined}>
        {found.map((link) => (
          <List.Item
            key={link.id}
            title={link.name}
            subtitle={link.folder}
            keywords={link.folder.split("/")}
            icon={{ fileIcon: link.path }}
            accessories={[{ date: link.used, tooltip: `Last used ${link.used.toLocaleString()}` }]}
            actions={
              <ActionPanel>
                <Action title="Copy Link" icon={Icon.Link} onAction={() => run(linkyURL("copy-id", { id: link.id }))} />
                <Action
                  title="Open File"
                  icon={Icon.ArrowNe}
                  onAction={() => run(linkyURL("open", { id: link.id, p: link.path }))}
                />
                <Action
                  title="Show in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => run(linkyURL("reveal", { id: link.id, p: link.path }))}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={link.path}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action title="Manage Links in Linky" icon={Icon.Gear} onAction={() => run(linkyURL("links"))} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
