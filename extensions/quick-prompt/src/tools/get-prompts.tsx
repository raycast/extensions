import { LocalStorage } from "@raycast/api";
import { Prompt } from "../types";

type Input = {
  /**
   * The status of the prompts to get.
   * @default "all"
   */
  status: "all" | "enabled" | "disabled";
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");
  if (input.status === "all") {
    return prompts;
  }
  return prompts.filter((prompt) => prompt.enabled === (input.status === "enabled"));
}
