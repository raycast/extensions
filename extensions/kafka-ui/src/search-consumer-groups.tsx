import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  fetchConsumerGroups,
  fetchConsumerGroupDetail,
  buildConsumerGroupUrl,
  buildConsumerGroupsListUrl,
  buildTopicUrl,
} from "./api";
import { EnvDropdown, useEnvironments } from "./env-actions";
import { determineLagStatus, formatLag, lagStatusIcon, statusColor } from "./lag-utils";
import { ConsumerGroupOverview, ConsumerGroupPartition, StoredEnvironment, TopicLagSummary } from "./types";

function aggregateByTopic(groupId: string, partitions: ConsumerGroupPartition[]): TopicLagSummary[] {
  const topicMap = new Map<string, ConsumerGroupPartition[]>();
  for (const p of partitions) {
    const existing = topicMap.get(p.topic) ?? [];
    existing.push(p);
    topicMap.set(p.topic, existing);
  }
  return Array.from(topicMap.entries()).map(([topic, parts]) => ({
    topic,
    consumerGroup: groupId,
    totalLag: parts.reduce((sum, p) => sum + (p.messagesBehind ?? 0), 0),
    partitions: parts,
  }));
}

function ConsumerGroupDetailView({ env, group }: { env: StoredEnvironment; group: ConsumerGroupOverview }) {
  const { isLoading, data, revalidate, error } = useCachedPromise(fetchConsumerGroupDetail, [
    env.kafkaUiUrl,
    env.clusterName,
    group.groupId,
  ]);

  useEffect(() => {
    if (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch consumer group details",
        message: String(error),
      });
    }
  }, [error]);

  const topicSummaries = data ? aggregateByTopic(group.groupId, data.partitions ?? []) : [];
  const sortedSummaries = topicSummaries.sort((a, b) => b.totalLag - a.totalLag);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`[${env.name}] ${group.groupId}`}
      searchBarPlaceholder="Filter topics..."
    >
      <List.Section
        title={`Consumer Group: ${group.groupId}`}
        subtitle={`State: ${data?.state ?? group.state} | Topics: ${sortedSummaries.length}`}
      >
        {sortedSummaries.map((summary) => {
          const status = determineLagStatus(summary.totalLag);
          return (
            <List.Item
              key={summary.topic}
              icon={lagStatusIcon(status)}
              title={summary.topic}
              subtitle={`${summary.partitions.length} partitions`}
              accessories={[
                {
                  tag: {
                    value: `Lag: ${formatLag(summary.totalLag)}`,
                    color: statusColor(status),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Eye}
                    title="View Partition Detail"
                    target={<PartitionDetailView env={env} summary={summary} />}
                  />
                  <Action.OpenInBrowser
                    title="Open Consumer Group in Kafka UI"
                    url={buildConsumerGroupUrl(env.kafkaUiUrl, env.clusterName, group.groupId)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Topic in Kafka UI"
                    url={buildTopicUrl(env.kafkaUiUrl, env.clusterName, summary.topic)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Topic Name"
                    content={summary.topic}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function PartitionDetailView({ env, summary }: { env: StoredEnvironment; summary: TopicLagSummary }) {
  const sortedPartitions = [...summary.partitions].sort((a, b) => a.partition - b.partition);

  return (
    <List navigationTitle={`[${env.name}] ${summary.topic} partitions`} searchBarPlaceholder="Filter partitions...">
      <List.Section
        title={summary.topic}
        subtitle={`Consumer: ${summary.consumerGroup} | Total Lag: ${formatLag(summary.totalLag)}`}
      >
        {sortedPartitions.map((p) => {
          const lag = p.messagesBehind ?? 0;
          const status = determineLagStatus(lag);
          return (
            <List.Item
              key={`${p.topic}-${p.partition}`}
              icon={lagStatusIcon(status)}
              title={`Partition ${p.partition}`}
              subtitle={p.consumerId ? `Consumer: ${p.consumerId}` : "No active consumer"}
              accessories={[
                { text: `${p.currentOffset}/${p.endOffset}` },
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
                    title="Open Topic in Kafka UI"
                    url={buildTopicUrl(env.kafkaUiUrl, env.clusterName, summary.topic)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Partition Info"
                    content={`Topic: ${p.topic}, Partition: ${p.partition}, Lag: ${lag}, Offset: ${p.currentOffset}/${p.endOffset}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function SearchConsumerGroups() {
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (environments.length > 0 && !environments.find((e) => e.id === selectedEnvId)) {
      setSelectedEnvId(environments[0].id);
    }
  }, [environments, selectedEnvId]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const {
    isLoading: dataLoading,
    data: groups = [],
    revalidate,
    error: groupsError,
  } = useCachedPromise(fetchConsumerGroups, [selectedEnv?.kafkaUiUrl ?? "", selectedEnv?.clusterName ?? ""], {
    execute: !!selectedEnv,
  });

  useEffect(() => {
    if (groupsError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch consumer groups",
        message: String(groupsError),
      });
    }
  }, [groupsError]);

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

  const filtered = groups.filter((g) => g.groupId.toLowerCase().includes(searchText.toLowerCase()));
  const sorted = filtered.sort((a, b) => (b.messagesBehind ?? 0) - (a.messagesBehind ?? 0));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search consumer groups..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <EnvDropdown environments={environments} selectedId={selectedEnvId} onSelect={setSelectedEnvId} />
      }
    >
      {sorted.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No consumer groups found"
          description={
            searchText
              ? `No groups matching "${searchText}"`
              : `No consumer groups in ${selectedEnv?.name ?? "selected environment"}`
          }
        />
      ) : (
        <List.Section title={`Consumer Groups [${selectedEnv?.name ?? ""}]`} subtitle={`${sorted.length} results`}>
          {sorted.map((group) => {
            const lag = group.messagesBehind ?? 0;
            const status = determineLagStatus(lag);
            return (
              <List.Item
                key={group.groupId}
                icon={lagStatusIcon(status)}
                title={group.groupId}
                subtitle={`${group.topics ?? 0} topics`}
                accessories={[
                  { text: group.state },
                  {
                    tag: {
                      value: `Lag: ${formatLag(lag)}`,
                      color: statusColor(status),
                    },
                  },
                ]}
                actions={
                  selectedEnv ? (
                    <ActionPanel>
                      <Action.Push
                        icon={Icon.List}
                        title="View Consumer Group Details"
                        target={<ConsumerGroupDetailView env={selectedEnv} group={group} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Kafka UI"
                        url={buildConsumerGroupUrl(selectedEnv.kafkaUiUrl, selectedEnv.clusterName, group.groupId)}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Consumer Groups Page"
                        url={buildConsumerGroupsListUrl(selectedEnv.kafkaUiUrl, selectedEnv.clusterName)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Group ID"
                        content={group.groupId}
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
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
