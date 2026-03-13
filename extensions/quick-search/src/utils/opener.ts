import { open } from "@raycast/api";

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const GoogleSearchOpner = async (text: string) => {
  await open(urlBuilder(`https://google.com/search?q=`, text));
};

export const GithubSearchOpner = async (text: string) => {
  await open(urlBuilder(`https://github.com/search?q=`, text));
};

export const GithubRepoOpner = async (text: string) => {
  await open(`https://github.com/${text}`);
};

export const DeeplOpner = async (text: string) => {
  await open(`https://deepl.com/translator#auto/auto/${text}`);
};
