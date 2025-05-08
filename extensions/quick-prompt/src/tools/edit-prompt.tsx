import { LocalStorage } from "@raycast/api";
import { Prompt } from "../types";

type Input = {
  /**
   * The id of the prompt to edit.
   */
  id: string;
  /**
   * The title of the prompt to edit.
   */
  title?: string;
  /**
   * The content of the prompt to edit.
   */
  content?: string;
  /**
   * The tags of the prompt to edit.
   */
  tags?: string[];
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");

  const prompt = prompts.find((prompt) => prompt.id === input.id);
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  prompt.title = input.title ?? prompt.title;
  prompt.content = input.content ?? prompt.content;
  prompt.tags = input.tags ?? prompt.tags;

  await LocalStorage.setItem("prompts", JSON.stringify(prompts));

  return prompt;
}
