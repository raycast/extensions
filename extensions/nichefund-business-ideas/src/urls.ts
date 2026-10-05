import { Teardown } from "./types";

const attribution = {
  utm_source: "raycast",
  utm_medium: "extension",
};

type AttributionContent = "latest" | "daily" | "random";

export function trackedUrl(url: string, content: AttributionContent): string {
  const result = new URL(url);
  const campaign = content === "random" ? "business-ideas" : "teardowns";
  Object.entries({
    ...attribution,
    utm_campaign: campaign,
    utm_content: content,
  }).forEach(([key, value]) => result.searchParams.set(key, value));
  return result.toString();
}

export function registrationUrl(content: AttributionContent): string {
  return trackedUrl("https://nichefund.app/register/", content);
}

export function teardownArchiveUrl(content: "latest" | "daily"): string {
  return trackedUrl("https://nichefund.app/teardowns/", content);
}

export function teardownUrl(
  teardown: Teardown,
  content: "latest" | "daily",
): string {
  return trackedUrl(teardown.url, content);
}
