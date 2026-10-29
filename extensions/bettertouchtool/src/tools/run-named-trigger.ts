import { Tool } from "@raycast/api";
import { runNamedTrigger } from "../ai-tools";
import { createBttClient } from "../btt";

type Input = {
  /** Exact UUID returned by search-named-triggers. Never invent or infer this value. */
  uuid: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ uuid }) => {
  try {
    const trigger = await createBttClient().getTrigger(uuid);
    return {
      message: `Run the BetterTouchTool named trigger “${trigger.BTTTriggerName || uuid}”?`,
      info: [{ name: "UUID", value: uuid }],
    };
  } catch {
    return { message: "Run this BetterTouchTool named trigger?", info: [{ name: "UUID", value: uuid }] };
  }
};

/**
 * Run an enabled BetterTouchTool named trigger. You must call search-named-triggers first and use its exact UUID.
 */
export default function tool({ uuid }: Input) {
  return runNamedTrigger(createBttClient(), uuid);
}
