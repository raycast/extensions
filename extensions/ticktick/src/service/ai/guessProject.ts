import { AI } from "@raycast/api";
import similarity from "similarity";
import { getProjects } from "../project";

const promptTemplate = `

Given the title, guess which project it belongs to.
You should write the project name as YOUR ANSWER.
You can just say 'Inbox' if it is irrelevant to any project.

TITLE:
{title}

PROJECTS:
{projects}

YOUR ANSWER:

`.trim();

export default async (title: string): Promise<string> => {
  const projects = getProjects();
  const prompt = promptTemplate
    .replace('{title}', title)
    .replace('{projects}', projects.map(p => `- ${p.name}`).join('\n'));

  const result = await AI.ask(prompt, { creativity: 0 });

  const guess = projects.map(({ id, name }) =>
    ({ id, name, similarity: similarity(name, result) })
  ).sort((a, b) => b.similarity - a.similarity)[0];

  return guess.similarity > 0.6 ? guess.id : 'index';
}
