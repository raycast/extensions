import { environment } from "@raycast/api";

// src/config.ts
export const DeepLink = {
  publisher: "bensomething",
  extensionName: environment.extensionName,
  command: "search-docs",
};

export function raycastCommandLink(context: { slug?: string; product?: string; view?: "detail" }) {
  // Use launchContext via the `context` query parameter (JSON, URL-encoded)
  const encodedContext = encodeURIComponent(JSON.stringify(context));
  return `raycast://extensions/${encodeURIComponent(DeepLink.publisher)}/${encodeURIComponent(
    DeepLink.extensionName,
  )}/${encodeURIComponent(DeepLink.command)}?context=${encodedContext}`;
}

export function raycastLinkForSlug(slug: string, view?: "detail") {
  return raycastCommandLink({ slug, product: "glossary", view });
}
