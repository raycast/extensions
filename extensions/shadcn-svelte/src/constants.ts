import { Toast } from "@raycast/api";

export const SHADCN_SVELTE = {
  BASE_URL: "https://www.shadcn-svelte.com",
  DOCS_BASE_URL: "https://www.shadcn-svelte.com/docs",
  COMPONENTS_URL: "https://www.shadcn-svelte.com/docs/components",
  COMPONENTS_API_URL: "https://www.shadcn-svelte.com/registry/index.json",
  GITHUB_URL: "https://github.com/huntabyte/shadcn-svelte/tree/dev",
  RAW_SHADCN_SVELTE_COMPONENTS: "https://github.com/huntabyte/shadcn-svelte/tree/main/apps/www/src/content/components",
} as const;

export const CREATE_ERROR_TOAST_OPTIONS = (e: Error): Toast.Options => ({
  style: Toast.Style.Failure,
  title: "Request failed 🔴",
  message: e.message || "Please try again later!",
});
