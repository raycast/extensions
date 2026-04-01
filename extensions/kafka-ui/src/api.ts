import { ConsumerGroupDetail, ConsumerGroupOverview, ConsumerGroupPartition, TopicOverview } from "./types";

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`[kafka-ui] GET ${url}`);
  const response = await fetch(url);
  // First handle HTTP errors so we can include status and body in logs.
  if (!response.ok) {
    const body = await response.text();
    console.error(`[kafka-ui] API error: ${response.status} ${response.statusText} - ${body}`);
    throw new Error(`Kafka UI API ${response.status}: ${response.statusText}. URL: ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    console.error(`[kafka-ui] Expected JSON but got "${contentType}" from ${url}`);
    console.error(`[kafka-ui] Response body (first 500 chars): ${body.substring(0, 500)}`);
    throw new Error(`Kafka UI returned non-JSON response. Verify your Kafka UI URL and Cluster Name. URL: ${url}`);
  }

  return response.json() as Promise<T>;
}

function unwrapArray<T>(data: unknown, arrayKey: string): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object" && arrayKey in data) {
    const nested = (data as Record<string, unknown>)[arrayKey];
    if (Array.isArray(nested)) return nested as T[];
  }

  console.error(`[kafka-ui] Unexpected response shape:`, JSON.stringify(data).substring(0, 500));
  return [];
}

function extractLag(raw: Record<string, unknown>): number {
  for (const key of ["messagesBehind", "consumerLag", "lag"]) {
    const val = raw[key];
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeConsumerGroupOverview(raw: Record<string, unknown>): ConsumerGroupOverview {
  return {
    groupId: (raw.groupId as string) ?? "",
    state: (raw.state as ConsumerGroupOverview["state"]) ?? "UNKNOWN",
    members: (raw.members ?? raw.activeConsumers ?? 0) as number,
    topics: (raw.topics ?? 0) as number,
    messagesBehind: extractLag(raw),
    coordinator: (raw.coordinator ?? 0) as number,
    partitionAssignor: (raw.partitionAssignor ?? "") as string,
  };
}

function normalizePartition(raw: Record<string, unknown>): ConsumerGroupPartition {
  return {
    topic: (raw.topic as string) ?? "",
    partition: (raw.partition ?? 0) as number,
    currentOffset: (raw.currentOffset ?? 0) as number,
    endOffset: (raw.endOffset ?? 0) as number,
    messagesBehind: extractLag(raw),
    consumerId: (raw.consumerId as string) ?? "",
    host: (raw.host as string) ?? "",
  };
}

export function buildKafkaUiHomeUrl(kafkaUiUrl: string): string {
  return normalizeUrl(kafkaUiUrl);
}

export function buildConsumerGroupsListUrl(kafkaUiUrl: string, clusterName: string): string {
  const base = normalizeUrl(kafkaUiUrl);
  return `${base}/ui/clusters/${clusterName}/consumer-groups`;
}

export function buildConsumerGroupUrl(kafkaUiUrl: string, clusterName: string, groupId: string): string {
  const base = normalizeUrl(kafkaUiUrl);
  return `${base}/ui/clusters/${clusterName}/consumer-groups/${encodeURIComponent(groupId)}`;
}

export function buildTopicUrl(kafkaUiUrl: string, clusterName: string, topicName: string): string {
  const base = normalizeUrl(kafkaUiUrl);
  return `${base}/ui/clusters/${clusterName}/all-topics/${encodeURIComponent(topicName)}`;
}

export async function fetchClusters(kafkaUiUrl: string): Promise<{ name: string; status: string }[]> {
  const base = normalizeUrl(kafkaUiUrl);
  const url = `${base}/api/clusters`;
  const data = await fetchJson<unknown>(url);
  const clusters = Array.isArray(data) ? data : [];
  console.log(
    `[kafka-ui] Available clusters:`,
    clusters.map((c: Record<string, unknown>) => c.name),
  );
  return clusters.map((c: Record<string, unknown>) => ({
    name: (c.name as string) ?? "",
    status: (c.status as string) ?? "UNKNOWN",
  }));
}

async function tryFetchConsumerGroups(base: string, clusterName: string): Promise<{ data: unknown; source: string }> {
  const pagedUrl = `${base}/api/clusters/${clusterName}/consumer-groups/paged?perPage=500&page=1`;
  console.log(`[kafka-ui] Trying paged endpoint: ${pagedUrl}`);
  try {
    const data = await fetchJson<unknown>(pagedUrl);
    console.log(`[kafka-ui] Paged endpoint succeeded`);
    return { data, source: "paged" };
  } catch {
    console.log(`[kafka-ui] Paged endpoint failed, trying non-paged`);
  }

  const plainUrl = `${base}/api/clusters/${clusterName}/consumer-groups`;
  const data = await fetchJson<unknown>(plainUrl);
  console.log(`[kafka-ui] Non-paged endpoint succeeded`);
  return { data, source: "plain" };
}

export async function fetchConsumerGroups(kafkaUiUrl: string, clusterName: string): Promise<ConsumerGroupOverview[]> {
  const base = normalizeUrl(kafkaUiUrl);
  const { data, source } = await tryFetchConsumerGroups(base, clusterName);
  const raw = unwrapArray<Record<string, unknown>>(data, "consumerGroups");
  console.log(
    `[kafka-ui] Consumer groups (source: ${source}) first item keys:`,
    raw[0] ? Object.keys(raw[0]) : "empty",
  );
  console.log(`[kafka-ui] Consumer groups first item sample:`, JSON.stringify(raw[0] ?? {}).substring(0, 500));
  return raw.map(normalizeConsumerGroupOverview);
}

export async function fetchConsumerGroupDetail(
  kafkaUiUrl: string,
  clusterName: string,
  groupId: string,
): Promise<ConsumerGroupDetail> {
  const base = normalizeUrl(kafkaUiUrl);
  const url = `${base}/api/clusters/${clusterName}/consumer-groups/${encodeURIComponent(groupId)}`;
  const raw = await fetchJson<Record<string, unknown>>(url);
  console.log(`[kafka-ui] Consumer group detail keys:`, Object.keys(raw));

  const rawPartitions = Array.isArray(raw.partitions) ? (raw.partitions as Record<string, unknown>[]) : [];
  if (rawPartitions.length > 0) {
    console.log(`[kafka-ui] Partition sample keys:`, Object.keys(rawPartitions[0]));
    console.log(`[kafka-ui] Partition sample:`, JSON.stringify(rawPartitions[0]).substring(0, 500));
  }

  return {
    groupId: (raw.groupId as string) ?? groupId,
    state: (raw.state as ConsumerGroupDetail["state"]) ?? "UNKNOWN",
    members: Array.isArray(raw.members) ? (raw.members as ConsumerGroupDetail["members"]) : [],
    partitions: rawPartitions.map(normalizePartition),
    coordinator: (raw.coordinator ?? 0) as number,
    partitionAssignor: (raw.partitionAssignor ?? "") as string,
  };
}

export async function fetchTopicConsumerGroups(
  kafkaUiUrl: string,
  clusterName: string,
  topicName: string,
): Promise<ConsumerGroupOverview[]> {
  const base = normalizeUrl(kafkaUiUrl);
  const url = `${base}/api/clusters/${clusterName}/topics/${encodeURIComponent(topicName)}/consumer-groups`;
  const data = await fetchJson<unknown>(url);
  const raw = unwrapArray<Record<string, unknown>>(data, "consumerGroups");
  console.log(`[kafka-ui] Topic consumer groups first item keys:`, raw[0] ? Object.keys(raw[0]) : "empty");
  console.log(`[kafka-ui] Topic consumer groups first item:`, JSON.stringify(raw[0] ?? {}).substring(0, 500));
  return raw.map(normalizeConsumerGroupOverview);
}

export async function fetchTopicConsumerGroupsWithLag(
  kafkaUiUrl: string,
  clusterName: string,
  topicName: string,
): Promise<ConsumerGroupOverview[]> {
  const groups = await fetchTopicConsumerGroups(kafkaUiUrl, clusterName, topicName);

  const enriched = await Promise.all(
    groups.map(async (group) => {
      try {
        const detail = await fetchConsumerGroupDetail(kafkaUiUrl, clusterName, group.groupId);
        const topicPartitions = detail.partitions.filter((p) => p.topic === topicName);
        const topicLag = topicPartitions.reduce((sum, p) => sum + (p.messagesBehind ?? 0), 0);
        console.log(
          `[kafka-ui] Computed lag for ${group.groupId} on ${topicName}: ${topicLag} (from ${topicPartitions.length} partitions)`,
        );
        return { ...group, messagesBehind: topicLag };
      } catch (err) {
        console.error(`[kafka-ui] Failed to fetch detail for ${group.groupId}:`, err);
        return group;
      }
    }),
  );

  return enriched;
}

export async function fetchTopics(kafkaUiUrl: string, clusterName: string): Promise<TopicOverview[]> {
  const base = normalizeUrl(kafkaUiUrl);
  const allTopics: TopicOverview[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${base}/api/clusters/${clusterName}/topics?showInternal=false&page=${page}&perPage=${perPage}`;
    const data = await fetchJson<unknown>(url);
    const topics = unwrapArray<TopicOverview>(data, "topics");
    allTopics.push(...topics);
    const pageCount = extractPageCount(data);
    console.log(`[kafka-ui] Topics page ${page}/${pageCount}, got ${topics.length} topics`);

    if (page >= pageCount || topics.length === 0) break;
    page++;
  }

  return allTopics;
}

function extractPageCount(data: unknown): number {
  if (data && typeof data === "object" && "pageCount" in data) {
    return (data as Record<string, number>).pageCount ?? 1;
  }
  return 1;
}
