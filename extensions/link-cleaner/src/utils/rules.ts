interface Rule {
  name: string;
  url: string;
  allowParams: string[];
}

const rules: Rule[] = [
  // Search Engines
  {
    name: "Google Search",
    url: "google.com",
    allowParams: ["q", "ie", "tbm", "tbs", "start", "num"],
  },
  {
    name: "Baidu Search",
    url: "baidu.com",
    allowParams: ["wd", "ie", "pn"],
  },
  {
    name: "Bing Search",
    url: "bing.com",
    allowParams: ["q", "first", "count"],
  },
  {
    name: "DuckDuckGo Search",
    url: "duckduckgo.com",
    allowParams: ["q", "t", "ia"],
  },

  // Video
  {
    name: "YouTube",
    url: "youtube.com",
    allowParams: ["v", "list", "index", "t", "search_query"],
  },
  {
    name: "YouTube Short",
    url: "youtu.be",
    allowParams: ["t"],
  },
  {
    name: "Bilibili",
    url: "bilibili.com",
    allowParams: ["p", "t"],
  },
  {
    name: "TikTok",
    url: "tiktok.com",
    allowParams: [],
  },
  {
    name: "Douyin",
    url: "douyin.com",
    allowParams: [],
  },
  {
    name: "Netflix",
    url: "netflix.com",
    allowParams: ["jbv"],
  },

  // Music
  {
    name: "Netease Music",
    url: "music.163.com",
    allowParams: ["id"],
  },
  {
    name: "Spotify",
    url: "open.spotify.com",
    allowParams: [],
  },
  {
    name: "Apple Music",
    url: "music.apple.com",
    allowParams: ["i", "l"],
  },

  // Social Media
  {
    name: "Twitter / X",
    url: "x.com",
    allowParams: [],
  },
  {
    name: "Twitter (legacy)",
    url: "twitter.com",
    allowParams: [],
  },
  {
    name: "Instagram Reel",
    url: "instagram.com/reel",
    allowParams: [],
  },
  {
    name: "Instagram Post",
    url: "instagram.com/p",
    allowParams: [],
  },
  {
    name: "Facebook",
    url: "facebook.com",
    allowParams: ["story_fbid", "id", "v"],
  },
  {
    name: "Reddit",
    url: "reddit.com",
    allowParams: [],
  },
  {
    name: "Weibo",
    url: "weibo.com",
    allowParams: [],
  },
  {
    name: "Weibo Short",
    url: "weibo.cn",
    allowParams: [],
  },
  {
    name: "Zhihu",
    url: "zhihu.com",
    allowParams: [],
  },
  {
    name: "Xiaohongshu",
    url: "xiaohongshu.com",
    allowParams: [],
  },
  {
    name: "Xiaohongshu Short",
    url: "xhslink.com",
    allowParams: [],
  },
  {
    name: "Pinterest",
    url: "pinterest.com",
    allowParams: [],
  },
  {
    name: "LinkedIn",
    url: "linkedin.com",
    allowParams: [],
  },
  {
    name: "Threads",
    url: "threads.net",
    allowParams: [],
  },

  // E-commerce
  {
    name: "Amazon",
    url: "amazon.",
    allowParams: ["dp", "s", "k"],
  },
  {
    name: "Taobao",
    url: "taobao.com",
    allowParams: ["id"],
  },
  {
    name: "Tmall",
    url: "tmall.com",
    allowParams: ["id"],
  },
  {
    name: "JD",
    url: "jd.com",
    allowParams: [],
  },

  // Developer
  {
    name: "GitHub",
    url: "github.com",
    allowParams: ["q", "tab", "page"],
  },
  {
    name: "Stack Overflow",
    url: "stackoverflow.com",
    allowParams: ["q", "tab", "page", "pagesize"],
  },
];

export { rules };
export type { Rule };
