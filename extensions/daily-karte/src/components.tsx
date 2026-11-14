import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Card } from "daily-karte";
import { APP_CONFIG } from "./service";

export function activityIcon(card: Pick<Card, "icon" | "color">) {
  const symbols: Record<string, Icon> = {
    sun: Icon.Sun,
    utensils: Icon.Mug,
    moon: Icon.Moon,
    coffee: Icon.Mug,
    book: Icon.Book,
    dumbbell: Icon.Bolt,
    languages: Icon.Globe,
    users: Icon.TwoPeople,
    leaf: Icon.Leaf,
    sparkles: Icon.Stars,
  };
  const colors: Record<string, Color> = {
    sage: Color.Green,
    amber: Color.Yellow,
    rose: Color.Red,
    blue: Color.Blue,
    lavender: Color.Purple,
  };
  if (card.icon.startsWith("emoji:"))
    return {
      source: {
        light: emojiSVG(card.icon.slice(6)),
        dark: emojiSVG(card.icon.slice(6)),
      },
    };
  return {
    source: symbols[card.icon] ?? Icon.Circle,
    tintColor: colors[card.color] ?? Color.PrimaryText,
  };
}

function emojiSVG(emoji: string) {
  const escaped = emoji.replace(
    /[&<>"']/g,
    (value) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[value]!,
  );
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="32" y="49" font-size="48" text-anchor="middle">${escaped}</text></svg>`)}`;
}

export function useLoad<T>(loader: () => Promise<T>) {
  const { data, error, isLoading, revalidate } = usePromise(loader, [], {
    onError: () => undefined,
  });
  return {
    value: data,
    error,
    loading: isLoading,
    refresh: () => {
      // ErrorView displays failures reported by the hook, including refresh failures.
      void revalidate().catch(() => undefined);
    },
  };
}

export function ErrorView({ error, refresh }: { error: Error; refresh: () => void }) {
  return (
    <List>
      <List.EmptyView
        title="Daily Karte Could Not Connect"
        description={error.message}
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={refresh} />
            <Action.OpenInBrowser title="Open Daily Karte" url={`https://${APP_CONFIG.projectId}.web.app`} />
          </ActionPanel>
        }
      />
    </List>
  );
}
