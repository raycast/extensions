import { AI } from "@raycast/api";
import similarity from "similarity";
import { getProjects } from "../project";

const promptTemplate = `

Given the task, guess which project it belongs to.
You should write the project name as YOUR ANSWER.
You can just say 'null' if it is irrelevant to all current projects.

TASK:
{task}

PROJECTS:
{projects}

YOUR ANSWER:

`.trim();

export default async (taskTitle: string): Promise<string | null> => {
  const projects = getProjects();
  const prompt = promptTemplate
    .replace("{task}", taskTitle)
    .replace("{projects}", projects.map((p) => `- ${p.name}`).join("\n"));

  const result = await AI.ask(prompt, { creativity: 0 });

  const guess = projects
    .map(({ id, name }) => ({ id, name, similarity: similarity(name, result) }))
    .sort((a, b) => b.similarity - a.similarity)[0];

  return guess.similarity > 0.6 ? guess.id : null;
};
