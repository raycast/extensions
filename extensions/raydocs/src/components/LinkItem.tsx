import LinkContent from "@/components/LinkContent";
import { Link } from "@/types";
import { getLinkMarkdown } from "@/utils/content";
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
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching Markdown…" });

    try {
      await Clipboard.copy(await getLinkMarkdown(link.url.markdown));
      toast.style = Toast.Style.Success;
      toast.title = "Copied as Markdown";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could Not Copy Markdown" });
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
