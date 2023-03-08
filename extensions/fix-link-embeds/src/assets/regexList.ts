export const regexList = [
  {
    test: /https?:\/\/twitter\.com(?=\/\w+?\/status\/)/g,
    replace: "https://fxtwitter.com",
  },
  {
    test: /https?:\/\/(?:www|vm)\.tiktok\.com/g,
    replace: "https://vm.tiktxk.com",
  },
  {
    test: /https?:\/\/(?:www\.)?instagram\.com(?=\/p\/)/g,
    replace: "https://ddinstagram.com",
  },
  {
    test: /https?:\/\/(?:www\.)?reddit\.com(?=\/r\/\w+?\/comments\/)/g,
    replace: "https://rxyddit.com",
  },
];
