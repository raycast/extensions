import { getApplications, open } from "@raycast/api";

export const trimString = (value: string = "", maxLength = 10) =>
  value.slice(0, maxLength) + (value.length > maxLength ? "..." : "");

export const openNotionUrl = async (url?: string) => {
  if (!url) return;

  const apps = await getApplications();
  const notionApp = apps.find((app) => app.name === "Notion");

  open(url, notionApp);
};
