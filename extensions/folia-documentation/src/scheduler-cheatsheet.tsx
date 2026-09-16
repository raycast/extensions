import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  LEGACY_SCHEDULER_NOTICE,
  SCHEDULER_APIS,
  SchedulerApi,
} from "./data/scheduler";
import { docsBase } from "./lib/constants";
import { getPreferences } from "./lib/preferences";

function markdown(api: SchedulerApi): string {
  return [
    `# ${api.name}`,
    `> ${api.tagline}`,
    "**When to use it**",
    api.whenToUse,
    "**Accessor**",
    `\`\`\`java\n${api.accessor}\n\`\`\``,
    "**Example**",
    `\`\`\`java\n${api.code}\n\`\`\``,
  ].join("\n\n");
}

function legacyNoticeMarkdown(): string {
  return ["# BukkitScheduler on Folia", LEGACY_SCHEDULER_NOTICE].join("\n\n");
}

export default function SchedulerCheatsheet() {
  const { docsVersion } = getPreferences();

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Browse Folia's region-aware scheduler APIs"
    >
      <List.Section
        title="Region Schedulers"
        subtitle={`${SCHEDULER_APIS.length}`}
      >
        {SCHEDULER_APIS.map((api) => (
          <List.Item
            key={api.name}
            icon={{ source: Icon.Clock, tintColor: Color.Purple }}
            title={api.name}
            subtitle={api.accessor}
            detail={<List.Item.Detail markdown={markdown(api)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Example Code"
                  content={api.code}
                  icon={Icon.CodeBlock}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.CopyToClipboard
                  title="Copy Accessor"
                  content={api.accessor}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action.OpenInBrowser
                  title="Open Javadoc"
                  url={`${docsBase(docsVersion)}${api.javadocName.replace(/\./g, "/")}.html`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Legacy Scheduler">
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="BukkitScheduler"
          subtitle="Bukkit.getScheduler() — not supported on Folia"
          detail={<List.Item.Detail markdown={legacyNoticeMarkdown()} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Notice"
                content={LEGACY_SCHEDULER_NOTICE}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
