import { Action, Tool } from "@raycast/api";

import { clearWalkHistory, getWalkHistory } from "../walk-history";

type Input = Record<string, never>;

export const confirmation: Tool.Confirmation<Input> = async () => {
  const history = await getWalkHistory();
  return {
    style: Action.Style.Destructive,
    message: "Permanently clear all locally saved Forest walk history?",
    info: [{ name: "Saved Walks", value: String(history.length) }],
  };
};

/** Permanently clears every locally saved Forest walk after user confirmation. */
export default async function clearHistory() {
  const history = await getWalkHistory();
  await clearWalkHistory();
  return { clearedCount: history.length, message: "Walk history cleared." };
}
