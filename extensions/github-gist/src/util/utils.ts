import { Form, getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;
import { parse } from "path";
import { GistFile, GistItem } from "./gist-utils";

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    personalAccessTokens: preferencesMap.get("access-token"),
    rememberTag: preferencesMap.get("remember-tag"),
    detail: preferencesMap.get("detail"),
    primaryAction: preferencesMap.get("primary-action"),
  };
};
export const preference = preferences();

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
