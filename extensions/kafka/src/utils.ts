import { getPreferenceValues } from "@raycast/api";
import { Admin, Kafka, KafkaConfig, logLevel } from "kafkajs";
import * as fs from "fs";
import path from "path";
import Os from "os";

export interface KafkaEnv {
  name: string;
  filterTopics?: string[];
  filterConsumers?: string[];
  kafkaJs: KafkaConfig;
}

export interface LagInfo {
  topicName: string;
  overallLag: number;
}

const configDirectory =
  getPreferenceValues<ExtensionPreferences>().configDirectory || path.resolve(Os.homedir(), ".kafka");
const envs = new Map<string, KafkaEnv>();
const files = fs.readdirSync(configDirectory, "utf-8");
for (const file of files) {
  const env = JSON.parse(fs.readFileSync(configDirectory + "/" + file).toString());
  envs.set(env.name, env);
}

const admins: Record<string, Admin> = {};

export function getExtractConfig() {
  const preferences = getPreferenceValues<Preferences.Kafka>();
  if (preferences.extractRegex) {
    return {
      regex: new RegExp(preferences.extractRegex),
      extractTitleGroup: preferences.extractTitleGroup && Number(preferences.extractTitleGroup),
      extractSubTitleGroup: preferences.extractSubTitleGroup && Number(preferences.extractSubTitleGroup),
      extractMetadataNameAndGroup:
        preferences.extractMetadataNameAndGroup &&
        preferences.extractMetadataNameAndGroup.split(",").map((split) => ({
          metadataName: split.split("=")[0],
          group: Number(split.split("=")[1]),
        })),
    };
  }
  return null;
}

export function getEnvs(): string[] {
  return Array.from(envs.keys());
}

export function getConfig(env: string): KafkaEnv {
  const conf = envs.get(env);
  if (!conf) {
    throw new Error("Unknown env : " + env);
  }
  if (!conf.kafkaJs.connectionTimeout) {
    conf.kafkaJs.connectionTimeout = 10000;
  }
  if (!conf.kafkaJs.requestTimeout) {
    conf.kafkaJs.requestTimeout = 30000;
  }
  conf.kafkaJs.logLevel = logLevel.ERROR;
  return conf;
}

export async function buildAdmin(env: string): Promise<Admin> {
  if (admins[env]) {
    return admins[env];
  }
  const conf = getConfig(env);
  const kafka = new Kafka(conf.kafkaJs);
  const admin = kafka.admin();
  await admin.connect();
  admins[env] = admin;
  return admin;
}

export async function getConsumerInfo(admin: Admin, groupId: string): Promise<LagInfo> {
  const consumerOffsets = await admin.fetchOffsets({
    groupId: groupId,
  });

  let overallLag = 0;
  let topicName = "";

  for (const consumerOffset of consumerOffsets) {
    topicName = consumerOffset.topic;
    const topicOffset = await admin.fetchTopicOffsets(topicName);

    let topicLag = 0;

    for (const partition of consumerOffset.partitions) {
      const current = +partition.offset;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const end = +topicOffset.find((value) => value.partition === partition.partition)!.offset;
      const partitionLag = end - current;
      topicLag += partitionLag;
    }

    overallLag += topicLag;
  }
  return { topicName, overallLag };
}
