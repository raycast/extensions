import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { App, PRICES, absolute, categoryLabel, pageUrl } from "./api";

const PRICE_COLORS = { free: Color.Green, freemium: Color.Blue, paid: Color.Orange, subscription: Color.Purple };

export function AppItem({ app, showCategory = true }: { app: App; showCategory?: boolean }) {
  const page = pageUrl(app);
  const accessories: List.Item.Accessory[] = [];
  if (app.featured) accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Featured" });
  if (showCategory) accessories.push({ text: categoryLabel(app.category) });
  accessories.push({ tag: { value: PRICES[app.priceType] ?? app.priceType, color: PRICE_COLORS[app.priceType] } });

  return (
    <List.Item
      id={app.id}
      title={app.name}
      subtitle={app.tagline}
      icon={app.icon ? { source: absolute(app.icon.url), mask: Image.Mask.RoundedRectangle } : Icon.AppWindow}
      keywords={[app.domain, categoryLabel(app.category)]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Mac Browse" url={page} />
          <Action.OpenInBrowser title="Open Website" url={app.url} icon={Icon.Globe} />
          <Action.CopyToClipboard
            title="Copy Mac Browse Link"
            content={page}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Website Link"
            content={app.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
