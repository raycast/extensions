import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchTopicConsumerGroupsWithLag, fetchTopics, buildConsumerGroupUrl, buildTopicUrl } from "./api";
import { EnvDropdown, useEnvironments } from "./env-actions";
import { determineLagStatus, formatLag, lagStatusIcon, statusColor } from "./lag-utils";
import { StoredEnvironment, TopicOverview } from "./types";

function getConfiguredPrefixes(env: StoredEnvironment): string[] {
  const raw = env.topicPrefixes ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function topicIcon(topic: TopicOverview): { source: Icon; tintColor: Color } {
  if (topic.underReplicatedPartitions > 0) {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  return { source: Icon.CircleFilled, tintColor: Color.Green };
}

function getTopicPrefix(topicName: string): string {
  const dotIndex = topicName.indexOf(".");
  return dotIndex > 0 ? topicName.substring(0, dotIndex) : topicName;
}

function groupByPrefix(topics: TopicOverview[]): Map<string, TopicOverview[]> {
  const groups = new Map<string, TopicOverview[]>();
  for (const topic of topics) {
    const prefix = getTopicPrefix(topic.name);
    const existing = groups.get(prefix) ?? [];
    existing.push(topic);
    groups.set(prefix, existing);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function consumerGroupStateColor(state: string): Color {
  switch (state) {
    case "STABLE":
      return Color.Green;
    case "EMPTY":
      return Color.SecondaryText;
    case "DEAD":
      return Color.Red;
    default:
      return Color.Orange;
  }
}

function TopicDetailView({ env, topic }: { env: StoredEnvironment; topic: TopicOverview }) {
  const {
    isLoading,
    data: consumers = [],
    revalidate,
    error,
  } = useCachedPromise(fetchTopicConsumerGroupsWithLag, [env.kafkaUiUrl, env.clusterName, topic.name]);

  useEffect(() => {
    if (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch consumer groups for topic",
        message: String(error),
      });
    }
  }, [error]);
  const sorted = [...consumers].sort((a, b) => (b.messagesBehind ?? 0) - (a.messagesBehind ?? 0));

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`[${env.name}] ${topic.name}`}
      searchBarPlaceholder="Filter consumer groups..."
    >
      <List.Section title="Topic Info">
        <List.Item
          icon={Icon.HardDrive}
          title={topic.name}
          accessories={[
            {
              tag: {
                value: `${topic.partitionCount} partitions`,
                color: Color.Blue,
              },
            },
            {
              tag: {
                value: `replication=${topic.replicationFactor}`,
                color: Color.Purple,
              },
            },
            { text: `Size: ${formatBytes(topic.segmentSize ?? 0)}` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Kafka UI"
                url={buildTopicUrl(env.kafkaUiUrl, env.clusterName, topic.name)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Topic Name"
                content={topic.name}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh Lag Data"
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Consumer Groups" subtitle={`${sorted.length} consumers`}>
        {sorted.length === 0 && !isLoading ? (
          <List.Item icon={Icon.Info} title="No consumer groups for this topic" />
        ) : (
          sorted.map((cg) => {
            const lag = cg.messagesBehind ?? 0;
            const status = determineLagStatus(lag);
            return (
              <List.Item
                key={cg.groupId}
                icon={lagStatusIcon(status)}
                title={cg.groupId}
                subtitle={`${cg.members ?? 0} members`}
                accessories={[
                  {
                    tag: {
                      value: cg.state,
                      color: consumerGroupStateColor(cg.state),
                    },
                  },
                  {
                    tag: {
                      value: `Lag: ${formatLag(lag)}`,
                      color: statusColor(status),
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Consumer Group in Kafka UI"
                      url={buildConsumerGroupUrl(env.kafkaUiUrl, env.clusterName, cg.groupId)}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Topic in Kafka UI"
                      url={buildTopicUrl(env.kafkaUiUrl, env.clusterName, topic.name)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Consumer Group ID"
                      content={cg.groupId}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                    <Action.CopyToClipboard
                      title="Copy Lag Summary"
                      content={`Topic: ${topic.name}\nConsumer: ${cg.groupId}\nLag: ${formatLag(lag)}\nStatus: ${status}`}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh Lag Data"
                      onAction={revalidate}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}

export default function SearchTopics() {
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isDeepSearch, setDeepSearch] = useState(false);

  useEffect(() => {
    if (environments.length > 0 && !environments.find((e) => e.id === selectedEnvId)) {
      setSelectedEnvId(environments[0].id);
    }
  }, [environments, selectedEnvId]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const {
    isLoading: dataLoading,
    data: topics = [],
    revalidate,
    error: topicsError,
  } = useCachedPromise(fetchTopics, [selectedEnv?.kafkaUiUrl ?? "", selectedEnv?.clusterName ?? ""], {
    execute: !!selectedEnv,
  });

  useEffect(() => {
    if (topicsError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch topics",
        message: String(topicsError),
      });
    }
  }, [topicsError]);

  const isLoading = envsLoading || dataLoading;

  if (environments.length === 0 && !envsLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gear}
          title="No Environments Configured"
          description='Run "Kafka Configuration Manager" to add your first environment'
        />
      </List>
    );
  }

  const configuredPrefixes = selectedEnv ? getConfiguredPrefixes(selectedEnv) : [];
  const hasPrefixFilter = configuredPrefixes.length > 0 && !isDeepSearch;

  const filtered = topics
    .filter((t) => !t.internal)
    .filter((t) => {
      if (hasPrefixFilter) {
        const prefix = getTopicPrefix(t.name).toLowerCase();
        return configuredPrefixes.includes(prefix);
      }
      return true;
    })
    .filter((t) => t.name.toLowerCase().includes(searchText.toLowerCase()));
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
  const grouped = groupByPrefix(sorted);

  const modeLabel = hasPrefixFilter ? "Filtered" : "All Topics";
  const toggleLabel = isDeepSearch ? "Switch to Filtered Prefixes" : "Deep Search (All Topics)";
  const toggleIcon = isDeepSearch ? Icon.Filter : Icon.MagnifyingGlass;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={hasPrefixFilter ? "Search within configured prefixes..." : "Search across all topics..."}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <EnvDropdown environments={environments} selectedId={selectedEnvId} onSelect={setSelectedEnvId} />
      }
    >
      {sorted.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No topics found"
          description={
            searchText
              ? `No topics matching "${searchText}"`
              : `No topics in ${selectedEnv?.name ?? "selected environment"} [${modeLabel}]`
          }
          actions={
            <ActionPanel>
              {configuredPrefixes.length > 0 && (
                <Action
                  icon={toggleIcon}
                  title={toggleLabel}
                  onAction={() => setDeepSearch(!isDeepSearch)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        Array.from(grouped.entries()).map(([prefix, prefixTopics]) => (
          <List.Section key={prefix} title={prefix} subtitle={`${prefixTopics.length} topics`}>
            {prefixTopics.map((topic) => (
              <List.Item
                key={topic.name}
                icon={topicIcon(topic)}
                title={topic.name}
                accessories={[
                  {
                    tag: {
                      value: `${topic.partitionCount} partitions`,
                      color: Color.Blue,
                    },
                  },
                  {
                    tag: {
                      value: `replication=${topic.replicationFactor}`,
                      color: Color.Purple,
                    },
                  },
                  { text: formatBytes(topic.segmentSize ?? 0) },
                ]}
                actions={
                  selectedEnv ? (
                    <ActionPanel>
                      <Action.Push
                        icon={Icon.Eye}
                        title="View Topic Details"
                        target={<TopicDetailView env={selectedEnv} topic={topic} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Kafka UI"
                        url={buildTopicUrl(selectedEnv.kafkaUiUrl, selectedEnv.clusterName, topic.name)}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      {configuredPrefixes.length > 0 && (
                        <Action
                          icon={toggleIcon}
                          title={toggleLabel}
                          onAction={() => setDeepSearch(!isDeepSearch)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Topic Name"
                        content={topic.name}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action
                        icon={Icon.ArrowClockwise}
                        title="Refresh"
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  ) : undefined
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
