import { Tool } from "@raycast/api";
import { createMonitor, MonitorKind } from "../lib/monitors";

type Input = {
  /**
   * Either account to watch an X account or keyword to watch a search query.
   */
  kind: MonitorKind;
  /**
   * For account, a username, @username or numeric user ID. For keyword, a search query with optional X operators.
   */
  target: string;
  /**
   * An optional label of up to 80 characters.
   */
  name?: string;
  /**
   * Event types to watch, such as tweet.new, tweet.reply and tweet.quote. Defaults to tweet.new.
   */
  eventTypes?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async ({ target }) => ({
  message: `Create a monitor for ${target}?`,
  info: [
    { name: "Target", value: target },
    { name: "Cost", value: "30 credits an hour" },
  ],
});

/**
 * Create an Xquik monitor. An active monitor costs 30 credits an hour.
 */
export default async function tool({ kind, target, name, eventTypes = ["tweet.new"] }: Input) {
  const { id, isActive } = await createMonitor(kind, { target, name, eventTypes });
  return { id, target, isActive };
}
