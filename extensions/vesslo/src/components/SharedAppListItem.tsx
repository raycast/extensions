import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { VessloApp } from "../types";
import {
  getAppStoreUrl,
  openInVesslo,
  openUpdateInVesslo,
  runBrewUpgrade,
  runBrewUpgradeInTerminal,
  runMasUpgradeInTerminal,
} from "../utils/actions";
import { isUpdatableApp, updateRouteGroup } from "../utils/update-filter";
import { normalizeBrewCaskToken } from "../utils/brew";

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
  const hasUpdate = isUpdatableApp(app);
  const routeGroup = updateRouteGroup(app);
  const caskToken =
    routeGroup === "homebrew" ? normalizeBrewCaskToken(app.homebrewCask) : null;
  const appStoreUrl =
    routeGroup === "appStore" ? getAppStoreUrl(app.appStoreId) : null;
  const canRunMas =
    app.primaryActionKind === "runAppStore" && appStoreUrl !== null;

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
  if (hasUpdate) {
    accessories.push({ tag: { value: "UPDATE", color: Color.Green } });
  }

  // Source badges
  app.sources.forEach((source) => {
    const color =
      source === "Brew"
        ? Color.Orange
        : source === "App Store"
          ? Color.Blue
          : source === "Sparkle"
            ? Color.Green
            : Color.SecondaryText;
    accessories.push({ tag: { value: source, color } });
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

          {hasUpdate && (
            <ActionPanel.Section title="Update">
              {caskToken && (
                <Action
                  title="Update Via Homebrew"
                  icon={Icon.ArrowDown}
                  onAction={() => runBrewUpgrade(caskToken, app.name)}
                />
              )}
              {caskToken && (
                <Action
                  title="Update Via Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={() => runBrewUpgradeInTerminal(caskToken)}
                />
              )}
              {appStoreUrl && (
                <Action.OpenInBrowser
                  title="Open in App Store"
                  url={appStoreUrl}
                />
              )}
              {canRunMas && (
                <Action
                  title="Update Via Terminal (Mas)"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  onAction={() => runMasUpgradeInTerminal(app.appStoreId!)}
                />
              )}
              {routeGroup === "sparkle" && app.bundleId && (
                <Action
                  title="Update in Vesslo"
                  icon={Icon.Download}
                  onAction={() => openUpdateInVesslo(app.bundleId!)}
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
