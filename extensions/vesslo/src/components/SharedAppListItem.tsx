import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { VessloApp } from "../types";
import {
  getAppStoreUrl,
  openInVesslo,
  runBrewUpgrade,
  runBrewUpgradeInTerminal,
  runMasUpgradeInTerminal,
} from "../utils/actions";
import { getSourceColor } from "../constants";

interface SharedAppListItemProps {
  app: VessloApp;
  matchedFields?: string[];
  extraActions?: React.ReactNode;
  onTagClick?: (tag: string) => void;
  showBackToTags?: boolean; // For navigation in browse-by-tags
  onBackToTags?: () => void;
}

export function SharedAppListItem({
  app,
  matchedFields = [],
  extraActions,
  onTagClick,
  showBackToTags,
  onBackToTags,
}: SharedAppListItemProps) {
  const subtitle = [app.version, app.developer, ...app.tags.map((t) => `#${t}`)]
    .filter(Boolean)
    .join(" • ");

  const accessories: List.Item.Accessory[] = [];

  // Show matched field indicators
  matchedFields.forEach((field) => {
    let icon: Icon;
    let color: Color;
    let tooltip: string;

    switch (field) {
      case "developer":
        icon = Icon.Person;
        color = Color.Blue;
        tooltip = "Matched: Developer";
        break;
      case "memo":
        icon = Icon.Document;
        color = Color.Orange;
        tooltip = "Matched: Memo";
        break;
      case "tag":
        icon = Icon.Tag;
        color = Color.Purple;
        tooltip = "Matched: Tag";
        break;
      default:
        icon = Icon.Circle;
        color = Color.SecondaryText;
        tooltip = "Matched";
    }

    accessories.push({ icon: { source: icon, tintColor: color }, tooltip });
  });

  // Update badge
  if (app.targetVersion) {
    accessories.push({ tag: { value: "UPDATE", color: Color.Green } });
  }

  // Source badges
  app.sources.forEach((source) => {
    accessories.push({ tag: { value: source, color: getSourceColor(source) } });
  });

  // Icon
  const icon = app.icon
    ? { source: `data:image/png;base64,${app.icon}` }
    : Icon.AppWindow;

  return (
    <List.Item
      icon={icon}
      title={app.name}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open App" target={app.path} />
            <Action.ShowInFinder path={app.path} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {app.bundleId && (
              <Action
                title="Open in Vesslo"
                icon={Icon.Link}
                onAction={() => openInVesslo(app.bundleId!)}
              />
            )}
            {app.bundleId && (
              <Action.CopyToClipboard
                title="Copy Bundle ID"
                content={app.bundleId}
              />
            )}
          </ActionPanel.Section>

          {app.targetVersion && (
            <ActionPanel.Section title="Update">
              {app.sources.includes("Brew") && app.homebrewCask && (
                <Action
                  title="Update Via Homebrew"
                  icon={Icon.ArrowDown}
                  onAction={() => runBrewUpgrade(app.homebrewCask!, app.name)}
                />
              )}
              {app.sources.includes("Brew") && app.homebrewCask && (
                <Action
                  title="Update Via Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={() => runBrewUpgradeInTerminal(app.homebrewCask!)}
                />
              )}
              {app.sources.includes("App Store") && app.appStoreId && (
                <Action.OpenInBrowser
                  title="Open in App Store"
                  url={getAppStoreUrl(app.appStoreId)}
                />
              )}
              {app.sources.includes("App Store") && app.appStoreId && (
                <Action
                  title="Update Via Terminal (Mas)"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  onAction={() => runMasUpgradeInTerminal(app.appStoreId!)}
                />
              )}
              {app.sources.includes("Sparkle") && app.bundleId && (
                <Action
                  title="Update in Vesslo"
                  icon={Icon.Download}
                  onAction={() => openInVesslo(app.bundleId!)}
                />
              )}
            </ActionPanel.Section>
          )}

          {/* Tags Navigation Actions */}
          <ActionPanel.Section title="Tags">
            {onTagClick &&
              app.tags.map((tag) => (
                <Action
                  key={tag}
                  title={`Browse #${tag}`}
                  icon={Icon.Tag}
                  onAction={() => onTagClick(tag)}
                />
              ))}
          </ActionPanel.Section>

          {/* Back Navigation */}
          {showBackToTags && onBackToTags && (
            <ActionPanel.Section>
              <Action
                title="Back to Tags"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
                onAction={onBackToTags}
              />
            </ActionPanel.Section>
          )}

          {extraActions && (
            <ActionPanel.Section>{extraActions}</ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
