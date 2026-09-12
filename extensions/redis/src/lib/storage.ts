import { RedisCommand } from "./redis";
import { LocalStorage } from "@raycast/api";

const redisCommandsKey = "REDIS_COMMANDS";

export const setRedisCommands = async (commands: RedisCommand[]) => {
  await LocalStorage.setItem(redisCommandsKey, JSON.stringify(commands));
};

export const getRedisCommands = async (): Promise<RedisCommand[]> => {
  const item = await LocalStorage.getItem(redisCommandsKey);
  try {
    return item ? (JSON.parse(item.toString()) as RedisCommand[]) : [];
  } catch (_) {
    return [];
  }
};

export const clearRedisCommands = async () => {
  await LocalStorage.removeItem(redisCommandsKey);
};
