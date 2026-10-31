import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ReactNode } from "react";
import { listCards } from "../lib/ift.ts";
import type { Card } from "../lib/parse.ts";

const STATE_COLORS: Record<string, Color> = {
  working: Color.Purple,
  waiting: Color.Yellow,
  failed: Color.Red,
  done: Color.Green,
};

// Every card on the canvas, across workspaces, in number order. The caller supplies what a row does.
export function CardList({ actions }: { actions: (card: Card) => ReactNode }) {
  const { data, isLoading, error } = useCachedPromise(listCards, [], { keepPreviousData: false });
  const cards = [...(data ?? [])].sort((a, b) => a.number - b.number);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter cards by directory or number">
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="infiniterm is not reachable" description={error.message} />
      )}
      {cards.map((c) => (
        <List.Item
          key={c.id}
          icon={Icon.Terminal}
          title={c.cwd}
          subtitle={`#${c.number}`}
          keywords={[String(c.number), `#${c.number}`, c.state, ...(c.remote ? [c.remote] : [])]}
          accessories={[
            ...(c.remote ? [{ text: c.remote }] : []),
            ...(STATE_COLORS[c.state] ? [{ tag: { value: c.state, color: STATE_COLORS[c.state] } }] : []),
          ]}
          actions={actions(c)}
        />
      ))}
    </List>
  );
}
