import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";
import { useAuditLog } from "../hooks/useAuditLog";
import { useEnvironments } from "../hooks/useLDMetadata";
import { LDAuditLogEntry } from "../types";
import { getFullName } from "../utils/avatarUtils";
import { formatDate, formatRelativeDate } from "../utils/format";
import { getAuditLogUrl } from "../utils/ld-urls";
import { SWITCH_PROJECT_SHORTCUT } from "../utils/shortcuts";
import SwitchProject from "./SwitchProject";

interface AuditLogListProps {
  projectKey: string;
  /** Restrict to a single flag; omit for the whole project. */
  flagKey?: string;
  flagName?: string;
}

/** Extract `env/<key>` from a resource specifier like `proj/p:env/production:flag/my-flag`. */
function environmentFromResources(entry: LDAuditLogEntry): string | undefined {
  for (const resource of entry.target?.resources ?? []) {
    const match = /:env\/([^:]+)/.exec(resource);
    if (match && match[1] !== "*") return match[1];
  }
  return undefined;
}

function flagKeyFromResources(entry: LDAuditLogEntry): string | undefined {
  for (const resource of entry.target?.resources ?? []) {
    const match = /:flag\/([^:;]+)/.exec(resource);
    if (match && match[1] !== "*") return match[1];
  }
  return undefined;
}

function actorName(entry: LDAuditLogEntry): string {
  if (entry.member) return getFullName(entry.member) || "Unknown member";
  if (entry.token?.name) return `Token: ${entry.token.name}`;
  return "LaunchDarkly";
}

function verbColor(verb = ""): Color {
  if (/turned on|created|added|enabled/i.test(verb)) return Color.Green;
  if (/turned off|deleted|removed|archived|disabled/i.test(verb)) return Color.Red;
  return Color.SecondaryText;
}

function entryMarkdown(entry: LDAuditLogEntry, envName?: string): string {
  const lines = [`## ${entry.title ?? entry.titleVerb ?? entry.kind ?? "Change"}`];
  if (entry.description && entry.description !== entry.title) lines.push("", entry.description);
  if (entry.comment) lines.push("", "> " + entry.comment.replace(/\n/g, "\n> "));
  lines.push("", "---", "");
  lines.push(`- **By:** ${actorName(entry)}`);
  lines.push(`- **When:** ${formatDate(entry.date)} (${formatRelativeDate(entry.date)})`);
  if (envName) lines.push(`- **Environment:** ${envName}`);
  if (entry.target?.name) lines.push(`- **Resource:** ${entry.target.name}`);
  return lines.join("\n");
}

export default function AuditLogList({ projectKey, flagKey, flagName }: AuditLogListProps) {
  const [environmentKey, setEnvironmentKey] = useState<string>("");
  const { environments, environmentsByKey } = useEnvironments(projectKey);
  const { entries, isLoading, error, pagination, revalidate } = useAuditLog({
    projectKey,
    flagKey,
    environmentKey: environmentKey || undefined,
  });

  const title = flagKey ? `History: ${flagName ?? flagKey}` : `Recent Changes · ${projectKey}`;

  // Project-wide view only: a flag's history belongs to its project.
  const viewActions = (
    <ActionPanel.Section title="View">
      {!flagKey && (
        <Action.Push
          icon={Icon.Switch}
          title="Switch Project"
          shortcut={SWITCH_PROJECT_SHORTCUT}
          target={<SwitchProject />}
        />
      )}
      <Action
        icon={Icon.ArrowClockwise}
        title="Refresh"
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={title}
      searchBarPlaceholder="Filter changes…"
      pagination={pagination}
      actions={<ActionPanel>{viewActions}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Environment" storeValue onChange={setEnvironmentKey}>
          <List.Dropdown.Item title="All Environments" value="" />
          <List.Dropdown.Section title="Environments">
            {environments.map((env) => (
              <List.Dropdown.Item key={env.key} title={env.name} value={env.key} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load the audit log"
          description={error.message}
          actions={<ActionPanel>{viewActions}</ActionPanel>}
        />
      ) : entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No changes found"
          description={flagKey ? "This flag has no audit log entries yet" : `No recent changes in ${projectKey}`}
          actions={<ActionPanel>{viewActions}</ActionPanel>}
        />
      ) : (
        <List.Section title={title} subtitle={`${entries.length} entries`}>
          {entries.map((entry) => {
            const envKey = environmentFromResources(entry);
            const envName = envKey ? (environmentsByKey[envKey]?.name ?? envKey) : undefined;
            const resourceName = entry.name ?? entry.target?.name ?? flagKeyFromResources(entry) ?? "Flag";
            const actor = actorName(entry);
            return (
              <List.Item
                key={entry._id}
                icon={entry.member ? getAvatarIcon(actor) : Icon.Cog}
                title={entry.titleVerb ? `${entry.titleVerb} ${resourceName}` : resourceName}
                subtitle={actor}
                keywords={[resourceName, actor, envName ?? ""]}
                accessories={[
                  ...(envName ? [{ tag: { value: envName, color: verbColor(entry.titleVerb) } }] : []),
                  { date: new Date(entry.date), tooltip: formatDate(entry.date) },
                ]}
                detail={<List.Item.Detail markdown={entryMarkdown(entry, envName)} />}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      icon={Icon.Globe}
                      title="Open History in LaunchDarkly"
                      url={getAuditLogUrl(projectKey, flagKey ?? flagKeyFromResources(entry))}
                    />
                    <Action.CopyToClipboard
                      title="Copy Change Summary"
                      content={`${entry.title ?? entry.titleVerb ?? ""}\n${formatDate(entry.date)} by ${actor}`}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    {viewActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
