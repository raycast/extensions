import LinkContent from "@/components/LinkContent";
import { Link } from "@/types";
import { getLinkMarkdown } from "@/utils/content";
import { readCachedMarkdown, writeCachedMarkdown } from "@/utils/markdown-cache";
import { getLinkAppearance } from "@/utils/sections";
import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type Props = {
  link: Link;
  onVisit: (link: Link) => void;
  revalidate: () => void;
};

export default function LinkItem({ link, onVisit, revalidate }: Props) {
  async function copyAsMarkdown() {
    // A page read within the last day is copied straight from the cache: no network, works
    // offline, no progress toast worth showing.
    const cached = readCachedMarkdown(link.url.markdown);

    if (cached && !cached.stale) {
      try {
        await Clipboard.copy(cached.markdown);
        await showToast({ style: Toast.Style.Success, title: "Copied as Markdown" });
      } catch (error) {
        await showFailureToast(error, { title: "Could Not Copy Markdown" });
      }
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching Markdown…" });

    // Fetching and copying fail for unrelated reasons, so they get their own error handling —
    // otherwise a clipboard failure reads as "could not reach the docs" and silently falls back
    // to older text even though the fetch succeeded.
    let markdown: string;
    let servedFromCache = false;

    try {
      markdown = await getLinkMarkdown(link.url.markdown);
      writeCachedMarkdown(link.url.markdown, markdown);
    } catch (fetchError) {
      if (!cached) {
        await toast.hide();
        await showFailureToast(fetchError, { title: "Could Not Copy Markdown" });
        return;
      }

      markdown = cached.markdown;
      servedFromCache = true;
    }

    try {
      await Clipboard.copy(markdown);
      toast.style = Toast.Style.Success;
      toast.title = "Copied as Markdown";

      if (servedFromCache) {
        toast.message = "Could not reach the docs — copied the last saved version";
      }
    } catch (copyError) {
      await toast.hide();
      await showFailureToast(copyError, { title: "Could Not Copy Markdown" });
    }
  }

  return (
    <List.Item
      title={link.title}
      subtitle={link.url.path}
      icon={getLinkAppearance(link.sectionTitle, link.url.external)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Read"
            target={<LinkContent link={link} onVisit={onVisit} />}
            icon={Icon.ArrowRight}
            onPush={() => onVisit(link)}
          />
          <Action.OpenInBrowser url={link.url.path} onOpen={() => onVisit(link)} />
          <Action.CopyToClipboard
            title="Copy URL to Clipboard"
            content={link.url.path}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Markdown URL"
            icon={Icon.Link}
            content={link.url.markdown}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
          <Action
            title="Copy as Markdown"
            icon={Icon.Document}
            onAction={copyAsMarkdown}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "m" },
              Windows: { modifiers: ["ctrl", "shift"], key: "m" },
            }}
          />
          <Action
            title="Refresh Docs"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
