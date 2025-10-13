import { Toast } from "@raycast/api";

export const SHADCN_VUE = {
  BASE_URL: "https://www.shadcn-vue.com/",
  DOCS_BASE_URL: "https://www.shadcn-vue.com/docs",
  COMPONENTS_URL: "https://www.shadcn-vue.com/docs/components",
  COMPONENTS_API_URL: "https://www.shadcn-vue.com/r/index.json",
  GITHUB_URL: "https://github.com/radix-vue/shadcn-vue/tree/dev",
  RAW_SHADCN_VUE_COMPONENTS: "https://github.com/radix-vue/shadcn-vue/tree/dev/apps/www/src/content/docs/components",
} as const;

export const CREATE_ERROR_TOAST_OPTIONS = (e: Error): Toast.Options => ({
  style: Toast.Style.Failure,
  title: "Request failed 🔴",
  message: e.message || "Please try again later!",
});
