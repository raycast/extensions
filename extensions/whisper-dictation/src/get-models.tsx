import { AI, environment } from "@raycast/api";

export default async function GetModels() {
  if (!environment.canAccess("AI")) {
    return JSON.stringify({
      items: [],
    });
  }

  const models = Object.keys(AI.Model);

  const data = models.map((model: string) => ({
    title: model
      .replace(/_/g, " ")
      .replace(/(api|anthropic|openai)/gi, "")
      .trim(),
    value: model,
  }));

  return JSON.stringify({
    items: data,
  });
}
