import { Toast } from "@raycast/api";

export const SHADCN_URL = {
  DOCS_COMPONENTS: "https://ui.shadcn.com/docs/components",
  EXAMPLES: "https://ui.shadcn.com/examples",
  GITHUB: "https://github.com/shadcn-ui/ui/tree/main",
  RAW_GITHUB_COMPONENTS: "https://raw.githubusercontent.com/shadcn/ui/main/apps/www/content/docs/components",
} as const;

export const OCTOKIT_CONFIG = {
  owner: "shadcn",
  repo: "ui",
  pathExamples: "apps/www/app/(app)/examples",
} as const;

export const CREATE_ERROR_TOAST_OPTIONS = (e: Error): Toast.Options => ({
  style: Toast.Style.Failure,
  title: "Request failed 🔴",
  message: e.message || "Please try again later 🙏",
});
