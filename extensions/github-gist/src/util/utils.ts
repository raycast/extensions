import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { parse } from "path";
import { GistItem } from "./gist-utils";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    personalAccessTokens: preferencesMap.get("access-token"),
    rememberTag: preferencesMap.get("remember-tag"),
    detail: preferencesMap.get("detail"),
    primaryAction: preferencesMap.get("primary-action"),
    perPage: parseInt(preferencesMap.get("perPage")),
  };
};
export const preference = commonPreferences();

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const imgExt = [".svg", ".gif", ".jpg", ".jpeg", ".png"];

export const getGistDetailContent = (gistFile: GistItem, gistFileContent: string) => {
  const gistFileExt = parse(gistFile.filename).ext;
  if (imgExt.includes(gistFileExt)) {
    return `![](${gistFile.raw_url})`;
  }
  if (gistFileExt == ".md") {
    return gistFileContent;
  }
  return "```\n" + gistFileContent + "\n```";
};

export const raySo = (title: string, content: string) =>
  `https://ray.so/?colors=cnady&background=true&darkMode=false&padding=32&title=${title}&code=${content}&language=auto`;
