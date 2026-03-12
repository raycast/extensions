import { environment } from "@raycast/api";

// src/config.ts
export const DeepLink = {
  publisher: "bensomething",
  extensionName: environment.extensionName,
  command: "search-docs",
};

export function raycastLinkForSlug(slug: string) {
  // Use launchContext via the `context` query parameter (JSON, URL-encoded)
  const context = encodeURIComponent(JSON.stringify({ slug, product: "glossary" }));
  return `raycast://extensions/${encodeURIComponent(DeepLink.publisher)}/${encodeURIComponent(
    DeepLink.extensionName,
  )}/${encodeURIComponent(DeepLink.command)}?context=${context}`;
}
