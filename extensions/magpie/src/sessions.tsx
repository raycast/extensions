import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";

import type { SessionRow } from "./lib/parse";
import { parseSessions } from "./lib/parse";
import { ReloadAction } from "./lib/reload-action";
import { reportMagpieError } from "./lib/report-error";
import { useMagpie } from "./lib/use-magpie";

export default function Sessions() {
  const { isLoading, data, error, revalidate } = useMagpie(
    ["sessions", "--json"],
    parseSessions,
    20_000,
  );

  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);

  const groups = new Map<string, SessionRow[]>();
  for (const session of data ?? []) {
    const list = groups.get(session.agent) ?? [];
    list.push(session);
    groups.set(session.agent, list);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions">
      {error && !data ? (
        <List.EmptyView
          title="Couldn't load sessions"
          description={error.message}
          actions={<ReloadAction onReload={revalidate} />}
        />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          title="No sessions"
          description="magpie has no recent Claude Code, Codex, OpenCode, Pi, or Grok session to show."
          actions={<ReloadAction onReload={revalidate} />}
        />
      ) : (
        [...groups.entries()].map(([agent, sessions]) => (
          <List.Section key={agent} title={agent}>
            {sessions.map((session) => (
              <List.Item
                key={`${session.agent}-${session.id}`}
                icon={Icon.Message}
                title={session.title || session.id}
                subtitle={subtitle(session)}
                accessories={[
                  { text: compact(session.input + session.output) },
                  { text: price(session) },
                ]}
                actions={
                  <ActionPanel>
                    {session.resume ? (
                      <Action.CopyToClipboard
                        title="Copy Resume Command"
                        content={session.resume}
                      />
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy Session ID"
                      content={session.id}
                    />
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function subtitle(session: SessionRow): string {
  const folder = session.cwd?.split("/").filter(Boolean).at(-1);
  return [folder, session.models.join(", ")].filter(Boolean).join(" · ");
}

function price(session: SessionRow): string {
  if (session.unpriced || session.cost === 0) return "no price";
  const digits = session.cost >= 1 ? 2 : 3;
  return `≈$${session.cost.toFixed(digits)}`;
}

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return String(Math.round(value));
}

function trim(value: number): string {
  const text = value.toFixed(1);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}
