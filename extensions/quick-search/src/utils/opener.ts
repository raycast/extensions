import { runAppleScript } from "run-applescript";

export const openInBrowser = async (url: string) => {
  await runAppleScript(`do shell script "open ${url}"`);
};

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const GoogleSearchOpner = async (text: string) => {
  await openInBrowser(urlBuilder(`https://google.com/search?q=`, text));
};

export const GithubSearchOpner = async (text: string) => {
  await openInBrowser(urlBuilder(`https://github.com/search?q=`, text));
};

export const GithubRepoOpner = async (text: string) => {
  await openInBrowser(`https://github.com/${text}`);
};

export const DeeplOpner = async (text: string) => {
  await openInBrowser(`https://deepl.com/translator#auto/auto/${text}`);
};
