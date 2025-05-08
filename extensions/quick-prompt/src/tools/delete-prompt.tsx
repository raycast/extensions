import { Action, LocalStorage } from "@raycast/api";
import { Prompt } from "../types";

type Input = {
  /**
   * The id of the prompt to delete.
   */
  id: string;
};

export default async function tool(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");

  const prompt = prompts.find((prompt) => prompt.id === input.id);
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  prompts.splice(prompts.indexOf(prompt), 1);
  await LocalStorage.setItem("prompts", JSON.stringify(prompts));

  return prompt;
}

export async function confirmation(input: Input) {
  const data = await LocalStorage.getItem<string>("prompts");
  const prompts: Prompt[] = JSON.parse(data || "[]");

  const prompt = prompts.find((prompt) => prompt.id === input.id);
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to delete the prompt?",
    info: [
      { name: "Title", value: prompt.title },
      { name: "Content", value: prompt.content },
    ],
  };
}
