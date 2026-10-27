import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { SiteRow as SiteRowData } from "../lib/dashboard";

/**
 * The "site you're on" row. It says what actually happens to this host — a
 * matching rule can still be disabled, bypassed by an app rule, or idle while
 * routing is off — so the row never claims "tunneled" without checking.
 */
export function SiteRow({
  site,
  appName,
  onAdd,
  onExplain,
  onDisable,
  onTurnOn,
  onReveal,
}: {
  site: SiteRowData;
  appName?: string;
  onAdd: () => void | Promise<void>;
  onExplain: () => void | Promise<void>;
  onDisable: (target: { pattern: string; id: string }) => void | Promise<void>;
  onTurnOn: () => void | Promise<void>;
  onReveal: (pattern: string) => void | Promise<void>;
}) {
  const covered = site.coveredBy;

  if (!covered) {
    return (
      <List.Item
        id="current-site"
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        title={`Add ${site.host}`}
        subtitle={site.title ? `${site.title} — the tab you're on` : "The tab you're on"}
        actions={
          <ActionPanel>
            <Action title="Add as Target" icon={Icon.Plus} onAction={onAdd} />
            <Action title="Explain Routing" icon={Icon.QuestionMark} onAction={onExplain} />
            <Action.CopyToClipboard title="Copy Host" content={site.host} />
          </ActionPanel>
        }
      />
    );
  }

  const tint =
    site.state === "tunneled"
      ? Color.Green
      : site.state === "bypassed"
        ? Color.Orange
        : Color.SecondaryText;

  const tag =
    site.state === "tunneled" ? "Tunneled" : site.state === "bypassed" ? "Bypassed" : "Routing off";

  const subtitle =
    site.state === "tunneled"
      ? `Tunneled by ${covered.pattern}`
      : site.state === "bypassed"
        ? `${covered.pattern} matches, but ${appName ?? "this app"} is set to Direct`
        : `Covered by ${covered.pattern} — routing is off`;

  return (
    <List.Item
      id="current-site"
      icon={{ source: Icon.Globe, tintColor: tint }}
      title={site.host}
      subtitle={subtitle}
      accessories={[{ tag: { value: tag, color: tint } }]}
      actions={
        <ActionPanel>
          <Action title="Explain Routing" icon={Icon.QuestionMark} onAction={onExplain} />
          <ActionPanel.Section>
            {site.state === "tunneled" ? (
              <Action
                title="Disable This Target"
                icon={Icon.CircleDisabled}
                onAction={() => onDisable(covered)}
              />
            ) : null}
            {site.state === "routing-off" ? (
              <Action title="Turn Routing On" icon={Icon.Play} onAction={onTurnOn} />
            ) : null}
            <Action
              title="Reveal in Proxy Manager"
              icon={Icon.AppWindow}
              onAction={() => onReveal(covered.pattern)}
            />
            <Action.CopyToClipboard title="Copy Host" content={site.host} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
