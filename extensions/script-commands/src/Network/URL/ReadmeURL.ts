import { URLConstants } from "Const";

import { ContentType } from "@types";

export const readmeNormalURL = (path: string) => readmeURL(path, ContentType.Normal);

export const readmeRawURL = (path: string) => readmeURL(path, ContentType.Raw);

const readmeURL = (path: string, type: ContentType): string => {
  const base = type === ContentType.Raw ? URLConstants.baseRawURL : URLConstants.baseURL;

  return `${base}/${path}`;
};
