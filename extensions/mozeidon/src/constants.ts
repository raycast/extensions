import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences.Mozeidon>();
export const COMMAND_NAME = "Mozeidon";
export const MOZEIDON = preferences.mozeidon;
export const SEARCH_ENGINE = preferences.searchEngine;
export const FIREFOX_OPEN_COMMAND = preferences.firefox;
export const TABS_FALLBACK = `{"data":[]}`;
export enum TAB_TYPE {
  OPENED_TABS = "Opened Tabs",
  RECENTLY_CLOSED = "Recently Closed",
  BOOKMARKS = "Bookmarks",
  NONE = "",
}
export const MOZEIDON_DOCUMENTATION_URL =
  "https://github.com/egovelox/mozeidon?tab=readme-ov-file#mozeidon-firefox-addon";
export const SEARCH_ENGINES: { [T in typeof SEARCH_ENGINE]: string } = {
  Google: `https://google.com/search?q=`,
  Bing: `https://www.bing.com/search?q=`,
  Baidu: `https://www.baidu.com/s?wd=`,
  Brave: `https://search.brave.com/search?q=`,
  DuckDuckGo: `https://duckduckgo.com/?q=`,
};

export const UnknownErrorText = `
## 🚨 Error 

Something happened while trying to run your command.

Please, ensure that:
- \`\`Firefox\`\` browser is up and running
- \`\`Mozeidon\`\` firefox-addon is up and running inside Firefox
- \`\`Mozeidon native app\`\` is installed and configured in Firefox
- \`\`Mozeidon CLI\`\` is installed and its file path is correct in the Raycast extension settings

&nbsp;
&nbsp;

If you need help, you can read installation details on the [documentation page](${MOZEIDON_DOCUMENTATION_URL})

If it persists, you can open a new issue on the [issue page](https://github.com/egovelox/mozeidon/issues) 🙏
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";
