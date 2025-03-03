import { AI, environment } from "@raycast/api";
import type { ActiveTab } from "./active-tab";
import { getWriteableSpaces } from "./supermemory";
import { getPrefs } from "./prefs";
import { z } from "zod";

export async function inferSpaceForTab(tab: ActiveTab) {
  if (!getPrefs().autospace || !environment.canAccess(AI)) {
    return [];
  }

  const spaces = await getWriteableSpaces();

  if (spaces.length === 0) {
    return [];
  }

  const prompt = `
    You are a helpful assistant that is given a URL, its page title, and a list of spaces.
    You are tasked with selecting the most appropriate space(s) for the given URL, if any.
    Note, you do not need to select a space if the URL and title is not relevant to any of the spaces. 
    There will be many cases where the URL and title is not relevant to any of the spaces.
    You should return the list as a JSON array of strings. If no spaces are relevant, return an empty array. 
    Please do not include any other text in your response.
    Thank you!

    URL: ${tab.url}
    Title: ${tab.title}
    Spaces: ${spaces.map((space) => space.name).join(", ")}
    `;

  const result = await AI.ask(prompt, { model: AI.Model["OpenAI_GPT4o-mini"] });

  const parsedAIResult = z.array(z.string()).safeParse(JSON.parse(result));

  if (!parsedAIResult.success || parsedAIResult.data.length === 0) {
    return [];
  }

  const matchedSpaces = parsedAIResult.data
    .map((spaceName) => spaces.find((space) => space.name === spaceName))
    .filter((space): space is NonNullable<typeof space> => space !== undefined)
    .map((space) => ({
      uuid: space.uuid,
      id: space.id,
      name: space.name,
    }));

  return matchedSpaces;
}
