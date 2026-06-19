import { Action, ActionPanel, Clipboard, Color, Icon, List, showHUD } from "@raycast/api";
import { DesignSkill } from "../shared";
import { fetchDesignMd } from "../utils/api";
import { formatDownloadCount } from "../utils/format";
import { DesignDetail } from "./DesignDetail";

type Props = {
  design: DesignSkill;
  downloadCount?: number;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
};

export function DesignListItem({ design, downloadCount, isFavorite, onToggleFavorite }: Props) {
  const installCommand = `npx getdesign@latest add ${design.slug}`;

  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  }
  if (typeof downloadCount === "number") {
    accessories.push({
      icon: Icon.Download,
      text: formatDownloadCount(downloadCount),
      tooltip: `${downloadCount.toLocaleString()} installs`,
    });
  }

  return (
    <List.Item
      id={design.slug}
      title={design.name}
      subtitle={design.description}
      accessories={accessories}
      keywords={[design.slug, design.category]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Install Command" icon={Icon.Terminal} content={installCommand} />
            <Action.Push
              title="View DESIGN.md"
              icon={Icon.Eye}
              target={<DesignDetail design={design} />}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action
              title="Copy DESIGN.md Content"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                try {
                  const content = await fetchDesignMd(design.slug);
                  await Clipboard.copy(content);
                  await showHUD("DESIGN.md copied");
                } catch {
                  await showHUD("Failed to fetch DESIGN.md");
                }
              }}
            />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={() => onToggleFavorite(design.slug)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open on Getdesign.md"
              url={design.siteUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard
              title="Copy DESIGN.md URL"
              content={design.designMdUrl}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
