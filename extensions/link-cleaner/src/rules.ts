interface Rule {
  name: string;
  url: string;
  allowParams: string[];
}

const rules: Rule[] = [
  {
    name: "Google Search",
    url: "google.com",
    allowParams: ["q", "ie"],
  },
  {
    name: "Baidu Search",
    url: "baidu.com",
    allowParams: ["wd", "ie"],
  },
  {
    name: "Bing Search",
    url: "bing.com",
    allowParams: ["q"],
  },
  {
    name: "Netease Music",
    url: "music.163.com",
    allowParams: ["id"],
  },
];

export { rules };
