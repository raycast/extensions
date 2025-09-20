import { Color } from "@raycast/api";

export const getLogLevelColor = (level: string) => {
  switch (level) {
    case "error":
      return Color.Red;
    case "warn":
      return Color.Orange;
    case "info":
      return Color.PrimaryText;
    case "debug":
      return Color.Blue;
    case "trace":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
};

export const removeAnsi = (str: string | null) =>
  // eslint-disable-next-line no-control-regex
  str?.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "") ?? "";

export const getQueryString = (query?: string, sourceId?: string) => {
  const params = new URLSearchParams();

  if (query) {
    params.set("query", query);
  }

  if (sourceId) {
    params.append("source_ids", sourceId);
  }
  return { query: query?.trim(), params: params.toString() };
};
