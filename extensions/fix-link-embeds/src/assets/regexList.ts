export const regexList = [
  {
    test: /https?:\/\/twitter\.com(?=\/\w+?\/status\/)/g,
    replace: "https://fxtwitter.com",
    settingsKey: "replaceTwitter",
  },
  {
    test: /https?:\/\/(?:www\.|vm\.)?tiktok\.com/g,
    replace: "https://tiktxk.com",
    settingsKey: "replaceTiktok",
  },
  {
    test: /https?:\/\/(?:www\.)?instagram\.com(?=\/p\/)/g,
    replace: "https://ddinstagram.com",
    settingsKey: "replaceInstagram",
  },
  {
    test: /https?:\/\/(?:www\.)?reddit\.com(?=\/r\/\w+?\/comments\/)/g,
    replace: "https://rxyddit.com",
    settingsKey: "replaceReddit",
  },
] as const;
