import { URL } from "url";

export const faviconUrl = (size: number, url: string): string => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
};

export const urlParser = (text: string): string | null => {
  const matchUrl = text.match(
    /https?:\/\/(www\.)?([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b)([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g
  );

  if (matchUrl) {
    return matchUrl[0];
  } else {
    return null;
  }
};
