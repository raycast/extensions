export const ENV_COLOR_OPTIONS = [
  { value: "Blue", label: "Blue" },
  { value: "Green", label: "Green" },
  { value: "Orange", label: "Orange" },
  { value: "Red", label: "Red" },
  { value: "Purple", label: "Purple" },
  { value: "Yellow", label: "Yellow" },
  { value: "Magenta", label: "Magenta" },
] as const;

export type EnvColorValue = (typeof ENV_COLOR_OPTIONS)[number]["value"];

export interface StoredEnvironment {
  id: string;
  name: string;
  kafkaUiUrl: string;
  clusterName: string;
  topicPrefixes: string;
  color: EnvColorValue;
}

export interface ConsumerGroupOverview {
  groupId: string;
  state: ConsumerGroupState;
  members: number;
  topics: number;
  messagesBehind: number;
  coordinator: number;
  partitionAssignor: string;
}

export type ConsumerGroupState =
  | "STABLE"
  | "PREPARING_REBALANCE"
  | "COMPLETING_REBALANCE"
  | "EMPTY"
  | "DEAD"
  | "UNKNOWN";

export interface ConsumerGroupDetail {
  groupId: string;
  state: ConsumerGroupState;
  members: ConsumerGroupMember[];
  partitions: ConsumerGroupPartition[];
  coordinator: number;
  partitionAssignor: string;
}

export interface ConsumerGroupMember {
  consumerId: string;
  clientId: string;
  host: string;
  assignment: TopicPartition[];
}

export interface TopicPartition {
  topic: string;
  partition: number;
}

export interface ConsumerGroupPartition {
  topic: string;
  partition: number;
  currentOffset: number;
  endOffset: number;
  messagesBehind: number;
  consumerId: string;
  host: string;
}

export interface TopicOverview {
  name: string;
  internal: boolean;
  partitionCount: number;
  replicationFactor: number;
  replicas: number;
  inSyncReplicas: number;
  segmentSize: number;
  segmentCount: number;
  underReplicatedPartitions: number;
  cleanUpPolicy: string;
}

export interface TopicLagSummary {
  topic: string;
  consumerGroup: string;
  totalLag: number;
  partitions: ConsumerGroupPartition[];
}

export enum LagStatus {
  OK = "OK",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}
