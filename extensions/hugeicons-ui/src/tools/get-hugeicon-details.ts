import {
  getAccurateAvailableStyles,
  getHugeiconsApiKey,
  resolveIconMetaByName,
  toAiIconSummary,
} from "../lib/hugeicons-ai";

type Input = {
  /**
   * Exact Hugeicons icon name to inspect, for example "star" or "test-tube-01".
   */
  name: string;
};

export default async function tool(input: Input) {
  const requestedName = input.name.trim();

  if (!requestedName) {
    return {
      found: false,
      requestedName,
      suggestions: [],
      message: "Provide an exact Hugeicons icon name to inspect.",
    };
  }

  const apiKey = await getHugeiconsApiKey();
  const abortController = new AbortController();
  const { match, suggestions } = await resolveIconMetaByName({
    name: requestedName,
    apiKey,
    signal: abortController.signal,
  });

  if (!match) {
    return {
      found: false,
      requestedName,
      suggestions: suggestions.map(toAiIconSummary),
      message: "No exact Hugeicons icon matched that name.",
    };
  }

  const availableStyles = await getAccurateAvailableStyles({
    name: match.name,
    apiKey,
    signal: abortController.signal,
  });

  return {
    found: true,
    requestedName,
    icon: {
      ...toAiIconSummary(match),
      availableStyles,
    },
    relatedIcons: suggestions.map(toAiIconSummary),
  };
}
