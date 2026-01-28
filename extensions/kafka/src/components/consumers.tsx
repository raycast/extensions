import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConsumerGroupState, GroupDescription, GroupOverview } from "kafkajs";
import { buildAdmin, getConfig, getConsumerInfo, getEnvs } from "../utils";
import { useCachedState } from "@raycast/utils";
import moment from "moment/moment";

interface ConsumerInfo {
  groupId: string;
  topicName?: string;
  state?: ConsumerGroupState;
  members?: number;
  overall?: number;
}

function getConsumerStateColor(state: ConsumerGroupState): Color.ColorLike {
  switch (state) {
    case "PreparingRebalance":
    case "CompletingRebalance":
      return Color.Yellow;
    case "Stable":
      return Color.Green;
    case "Dead":
      return Color.Red;
    case "Empty":
    case "Unknown":
      return Color.Brown;
  }
}

function getAccessories(consumer: ConsumerInfo) {
  const result = [];
  if (consumer.overall !== undefined) {
    result.push({ text: consumer.overall.toLocaleString() });
  }
  if (consumer.state) {
    result.push({
      tag: {
        color: getConsumerStateColor(consumer.state),
        value: consumer.state,
      },
    });
  }
  if (consumer.members !== undefined) {
    result.push({ text: consumer.members + " members" });
  }
  return result;
}

export default function KafkaConsumers() {
  const [isLoading, setIsLoading] = useState(false);
  const [env, setEnv] = useCachedState("env", getEnvs()[0]);
  const [consumers, setConsumers] = useState<ConsumerInfo[]>([]);

  const load = useCallback(async (env: string) => {
    const start = moment.now();
    setConsumers([]);
    console.info("[load] get kafka consumers for env:", env);
    setIsLoading(true);
    try {
      const admin = await buildAdmin(env);
      const filterConsumers = getConfig(env).filterConsumers;

      const groupIds = (await admin.listGroups()).groups
        .map((group: GroupOverview) => group.groupId)
        .filter((groupId) => {
          if (!filterConsumers) {
            return true;
          }
          return filterConsumers.some((filterConsumer) => groupId.includes(filterConsumer));
        });
      setConsumers(groupIds.map((group) => ({ groupId: group })));

      const groups = new Map<string, GroupDescription>(
        (await admin.describeGroups(groupIds)).groups.map((group) => [group.groupId, group])
      );

      setConsumers(
        Array.from(groups.values()).map((group) => {
          return {
            groupId: group.groupId,
            state: group.state,
            members: group.members.length,
          };
        })
      );

      // compute lag
      for (const groupId of groupIds) {
        const lagInfo = await getConsumerInfo(admin, groupId);
        setConsumers((existingItems) => {
          return existingItems
            .map((value) => {
              const newValue = JSON.parse(JSON.stringify(value));
              if (newValue.groupId === groupId) {
                newValue.topicName = lagInfo.topicName;
                newValue.overall = lagInfo.overallLag;
              }
              return newValue;
            })
            .sort((a, b) => {
              if (b.overall === a.overall) {
                return a.groupId.localeCompare(b.groupId);
              } else if (a.overall !== undefined && b.overall !== undefined) {
                return b.overall - a.overall;
              } else if (a.overall !== undefined) {
                return -1;
              } else if (b.overall !== undefined) {
                return 1;
              }
              return 0;
            });
        });
      }
    } catch (e) {
      console.error("Unable to get kafka consumers", e);
    } finally {
      setIsLoading(false);
      console.info(`[load] done in ${moment.utc(moment.now() - start).format("mm:ss.SSS")}`);
    }
  }, []);

  useEffect(() => {
    load(env).finally(() => console.debug("Init done"));
  }, [env, load]);

  const setOffset = useCallback(
    async (consumer: ConsumerInfo, from: Date | null | "latest" | "earliest" | number) => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Setting offset",
      });

      try {
        if (from === null) {
          toast.style = Toast.Style.Failure;
          toast.message = "Please select a date !";
          return;
        }
        if (!consumer.topicName) {
          toast.style = Toast.Style.Failure;
          toast.message = "Could not find topic name !";
          return;
        }
        if (
          await confirmAlert({
            title: `Set offset of '${consumer.groupId}' from ${
              typeof from === "number" ? "latest -" + from : from instanceof Date ? from.toISOString() : from
            } ?`,
            primaryAction: {
              title: "Reset",
              style: Alert.ActionStyle.Destructive,
            },
            icon: Icon.Gear,
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
          })
        ) {
          const admin = await buildAdmin(env);
          const baseOptions = {
            groupId: consumer.groupId,
            topic: consumer.topicName,
          };
          console.info("Set offset at", baseOptions, from);
          if (from instanceof Date) {
            const offsets = await admin.fetchTopicOffsetsByTimestamp(consumer.topicName, from.getTime());
            await admin.setOffsets({ ...baseOptions, partitions: offsets });
          } else if (from === "earliest") {
            const offsets = await admin.fetchTopicOffsets(consumer.topicName);
            await admin.setOffsets({
              ...baseOptions,
              partitions: offsets.map((offset) => ({
                partition: offset.partition,
                offset: offset.low,
              })),
            });
          } else if (from === "latest") {
            const offsets = await admin.fetchTopicOffsets(consumer.topicName);
            await admin.setOffsets({
              ...baseOptions,
              partitions: offsets.map((offset) => ({
                partition: offset.partition,
                offset: offset.offset,
              })),
            });
          } else {
            // from is number
            const offsets = await admin.fetchTopicOffsets(consumer.topicName);
            await admin.setOffsets({
              ...baseOptions,
              partitions: offsets.map((offset) => ({
                partition: offset.partition,
                offset: (Number(offset.offset) - 10).toString(),
              })),
            });
          }

          toast.style = Toast.Style.Success;
          toast.message = "Offset reset with success, reloading";

          await load(env);
          setIsLoading(false);
        } else {
          await toast.hide();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to reset offset" + "\n" + String(error);
      } finally {
        setIsLoading(false);
      }
    },
    [env, load]
  );

  return (
    <List
      filtering={true}
      isLoading={isLoading}
      navigationTitle={consumers.length + " consumers"}
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
      <List.Section title={consumers.length + " consumers"}>
        {consumers.map((consumer) => (
          <List.Item
            key={consumer.groupId}
            title={{ value: consumer.groupId, tooltip: consumer.topicName }}
            accessories={getAccessories(consumer)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={consumer.groupId} />
                <Action
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon={Icon.RotateClockwise}
                  onAction={async () => await load(env)}
                />
                <Action
                  title="Set Offset at Latest"
                  icon={Icon.ArrowRightCircleFilled}
                  onAction={() => setOffset(consumer, "latest")}
                />
                <Action
                  title="Set Offset at Earliest"
                  icon={Icon.ArrowLeftCircleFilled}
                  onAction={() => setOffset(consumer, "earliest")}
                />
                <Action.PickDate
                  title="Set Offset from Date"
                  icon={Icon.Clock}
                  onChange={(date) => setOffset(consumer, date)}
                />
                <Action
                  title="Set Offset from Latest - 10"
                  icon={Icon.MinusCircleFilled}
                  onAction={() => setOffset(consumer, 10)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
