import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import type { RecentAlias } from "../types/ddg";

type RecentAliasesProps = {
  aliases: RecentAlias[];
  onGenerate: () => Promise<void>;
  onClearRecentAliases: () => Promise<void>;
  onClearSession: () => Promise<void>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecentAliases({
  aliases,
  onGenerate,
  onClearRecentAliases,
  onClearSession,
}: RecentAliasesProps) {
  return (
    <List.Section title="Recent Aliases" subtitle={`${aliases.length}`}>
      {aliases.length === 0 ? (
        <List.Item
          icon={Icon.Envelope}
          title="No aliases yet"
          subtitle="Generate your first private Duck address"
          actions={
            <ActionPanel>
              <Action
                title="Generate New Alias"
                icon={Icon.Plus}
                onAction={onGenerate}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Clear Stored Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={onClearSession}
              />
            </ActionPanel>
          }
        />
      ) : (
        aliases.map((alias) => (
          <List.Item
            key={`${alias.fullAddress}-${alias.createdAt}`}
            icon={Icon.Envelope}
            title={alias.fullAddress}
            subtitle={formatDate(alias.createdAt)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Address"
                  content={alias.fullAddress}
                />
                <Action.Paste
                  title="Paste Address"
                  content={alias.fullAddress}
                />
                <Action
                  title="Generate New Alias"
                  icon={Icon.Plus}
                  onAction={onGenerate}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
                <Action
                  title="Clear Recent Aliases"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={onClearRecentAliases}
                />
                <Action
                  title="Clear Stored Session"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={onClearSession}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List.Section>
  );
}
