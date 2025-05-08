import { LocalStorage } from "@raycast/api";
import { Prompt } from "../types";

type Input = {
  /**
   * The keyword to search for.
   */
  keyword: string;
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");

  return prompts.filter((prompt) => prompt.title.includes(input.keyword) || prompt.content.includes(input.keyword));
}
