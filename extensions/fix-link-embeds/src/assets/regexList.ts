export const regexList = [
  {
    test: /https?:\/\/(?:twitter|x)\.com(?=\/\w+?\/status\/)/g,
    replace: "https://fxtwitter.com",
    settingsKey: "replaceTwitter",
  },
  {
    test: /https?:\/\/(?:www\.|vm\.)?tiktok\.com/g,
    replace: "https://tnktok.com",
    settingsKey: "replaceTiktok",
  },
  {
    test: /https?:\/\/(?:www\.)?instagram\.com(?=\/p\/)/g,
    replace: "https://ddinstagram.com",
    settingsKey: "replaceInstagram",
  },
  {
    test: /https?:\/\/(?:www\.)?instagram\.com(?=\/reels?\/)/g,
    replace: "https://fxig.seria.moe",
    settingsKey: "replaceInstagram",
  },
  {
    test: /https?:\/\/(?:www\.)?reddit\.com(?=\/(?:r\/[^/\s]+\/(?:comments|s)\/|comments\/))/gi,
    replace: "https://redditez.com",
    settingsKey: "replaceReddit",
  },
  {
    test: /https?:\/\/(?:www\.)?bsky\.app(?=\/profile\/[^/\s]+\/post\/)/g,
    replace: "https://fxbsky.app",
    settingsKey: "replaceBluesky",
  },
] as const;
