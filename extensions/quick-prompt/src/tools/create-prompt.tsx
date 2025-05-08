import { LocalStorage } from "@raycast/api";
import { Prompt } from "../types";
import { nanoid } from "nanoid";

type Input = {
  /**
   * The title of the prompt to create.
   */
  title: string;
  /**
   * The content of the prompt to create.
   */
  content: string;
  /**
   * The tags of the prompt to create.
   */
  tags?: string[];
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");

  const newPrompt = { id: nanoid(), title: input.title, content: input.content, enabled: true, tags: input.tags };
  prompts.push(newPrompt);

  await LocalStorage.setItem("prompts", JSON.stringify(prompts));

  return newPrompt;
}
