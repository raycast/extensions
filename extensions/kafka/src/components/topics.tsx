import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConfigEntries, ConfigResourceTypes } from "kafkajs";
import { buildAdmin, getConfig, getEnvs, getExtractConfig } from "../utils";
import { useCachedState } from "@raycast/utils";

interface ConfigEntry {
  name: string;
  value: string;
}

enum Compacted {
  loading = "loading",
  unauthorized = "unauthorized",
  compacted = "compacted",
  not_compacted = "not_compacted",
}

interface TopicInfo {
  name: string;
  title?: string;
  subtitle?: string;
  metadata: Record<string, string>;
  compacted: Compacted;
  config: ConfigEntry[];
  partitions?: number;
}

function getAccessories(topic: TopicInfo) {
  const result = [];
  if (topic.title) {
    result.push({
      text: topic.partitions?.toString(),
      tooltip: "Number of partitions",
    });
    for (const metadataKey in topic.metadata) {
      result.push({ text: topic.metadata[metadataKey] });
    }
  }
  switch (topic.compacted) {
    case Compacted.loading:
      result.push({ tag: { color: Color.Brown, value: topic.compacted } });
      break;
    case Compacted.unauthorized:
      result.push({ tag: { color: Color.Yellow, value: topic.compacted } });
      break;
    case Compacted.compacted:
      result.push({ tag: { color: Color.Green, value: topic.compacted } });
      break;
    case Compacted.not_compacted:
      result.push({ tag: { color: Color.Red, value: topic.compacted } });
      break;
  }
  return result;
}

function buildNamesAndMetadata(topic: string) {
  const config = getExtractConfig();
  const base = {
    name: topic,
    metadata: {} as Record<string, string>,
  };
  if (config === null) {
    return base;
  }

  const matches = topic.match(config.regex);
  if (!matches) {
    return base;
  }

  const title =
    config.extractTitleGroup && matches.length - 1 >= config.extractTitleGroup
      ? matches[config.extractTitleGroup]
      : undefined;
  const subtitle =
    config.extractSubTitleGroup && matches.length - 1 >= config.extractSubTitleGroup
      ? matches[config.extractSubTitleGroup]
      : undefined;

  if (config.extractMetadataNameAndGroup) {
    for (const element of config.extractMetadataNameAndGroup) {
      if (matches.length - 1 >= element.group) {
        base.metadata[element.metadataName] = matches[element.group];
      }
    }
  }

  return {
    ...base,
    ...(title && { title }),
    ...(subtitle && { subtitle }),
  };
}

export default function KafkaTopics() {
  const [isLoading, setIsLoading] = useState(false);
  const [withDetails, setWithDetails] = useState(false);
  const [env, setEnv] = useCachedState("env", getEnvs()[0]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);

  const load = useCallback(async (env: string) => {
    console.info("Get kafka topics for env:", env);
    setIsLoading(true);
    try {
      const admin = await buildAdmin(env);
      const filterTopics = getConfig(env).filterTopics;
      const topics = (await admin.listTopics())
        .filter((topic) => {
          if (!filterTopics) {
            return true;
          }
          return filterTopics.some((filterTopic) => topic.includes(filterTopic));
        })
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
      setTopics(
        topics.map((topic) => ({
          ...buildNamesAndMetadata(topic),
          compacted: Compacted.loading,
          config: [],
        }))
      );

      const metadata = new Map(
        (
          await admin.fetchTopicMetadata({
            topics: topics,
          })
        ).topics.map((topic) => [topic.name, topic.partitions.length])
      );
      setTopics(
        topics.map((topic) => ({
          ...buildNamesAndMetadata(topic),
          compacted: Compacted.loading,
          config: [],
          partitions: metadata.get(topic),
        }))
      );

      for (const topic of topics) {
        let compacted: Compacted;
        let config: ConfigEntry[] = [];

        try {
          const kafkaConfig = await admin.describeConfigs({
            resources: [{ type: ConfigResourceTypes.TOPIC, name: topic }],
            includeSynonyms: false,
          });

          config = kafkaConfig.resources[0].configEntries
            .map((configEntry: ConfigEntries) => {
              const entry = {
                name: configEntry.configName,
                value: configEntry.configValue,
              };
              if (configEntry.configName === "cleanup.policy") {
                compacted = configEntry.configValue === "compact" ? Compacted.compacted : Compacted.not_compacted;
              }
              return entry;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
          compacted = Compacted.unauthorized;
        }

        setTopics((existingItems) => {
          return existingItems.map((value) => {
            const newValue = JSON.parse(JSON.stringify(value));
            if (newValue.name === topic) {
              newValue.compacted = compacted;
              newValue.config = config;
            }
            return newValue;
          });
        });
      }
    } catch (e) {
      console.error("Unable to get kafka topics", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(env).finally(() => console.debug("Init done"));
  }, [env, load]);

  return (
    <List
      filtering={true}
      isShowingDetail={withDetails}
      isLoading={isLoading}
      navigationTitle={topics.length + " topics"}
      searchBarAccessory={
        <List.Dropdown tooltip="Change environment" value={env} onChange={(newValue) => setEnv(newValue)}>
          <List.Dropdown.Section title="Environment">
            {getEnvs().map((env) => (
              <List.Dropdown.Item key={env} title={env} value={env} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={topics.length + " topics"}>
        {topics.map((topic) => (
          <List.Item
            key={topic.name}
            title={{
              value: topic.title ? topic.title : topic.name,
              tooltip: `${topic.name}`,
            }}
            subtitle={topic.subtitle && { value: topic.subtitle }}
            detail={
              <List.Item.Detail
                isLoading={isLoading}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Name"} text={topic.name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"Partitions"} text={topic.partitions?.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    {Object.keys(topic.metadata).length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Metadata :"} />
                        {topic.title && <List.Item.Detail.Metadata.Label title={"Title"} text={topic.title} />}
                        {topic.subtitle && <List.Item.Detail.Metadata.Label title={"Subtitle"} text={topic.subtitle} />}
                        {Object.keys(topic.metadata).map((key) => (
                          <List.Item.Detail.Metadata.Label key={key} title={key} text={topic.metadata[key]} />
                        ))}
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    {topic.config.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label title={"Topic configuration :"} />
                        {topic.config.map((entry) => (
                          <List.Item.Detail.Metadata.Label key={entry.name} title={entry.name} text={entry.value} />
                        ))}
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={getAccessories(topic)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={topic.name} />
                <Action
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon={Icon.RotateClockwise}
                  onAction={async () => await load(env)}
                />
                <Action
                  icon={Icon.Info}
                  title="Display Details"
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => setWithDetails((withDetails) => !withDetails)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
