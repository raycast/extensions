export const USER_HOME = process.env.HOME || process.env.USERPROFILE || `/Users/${process.env.USER}`;

export const REMOTE_REGISTRY_SOURCES =
  "https://gist.githubusercontent.com/lihaizhong/bafad768c908871a689c020cc405c81e/raw/7be8cc3b29672fea581546a212c64446e94f654f/register.json";

export const REGISTRY_SOURCES = [
  {
    id: "npm",
    title: "npm",
    subtitle: "https://www.npmjs.org",
    registry: "https://registry.npmjs.org/",
  },
  {
    id: "yarn",
    title: "yarn",
    subtitle: "https://yarnpkg.com",
    registry: "https://registry.yarnpkg.com/",
  },
  {
    id: "tencent",
    title: "tencent",
    subtitle: "https://mirrors.cloud.tencent.com/npm/",
    registry: "https://mirrors.cloud.tencent.com/npm/",
  },
  {
    id: "cnpm",
    title: "cnpm",
    subtitle: "https://cnpmjs.org",
    registry: "https://r.cnpmjs.org/",
  },
  {
    id: "taobao",
    title: "taobao",
    subtitle: "https://npmmirror.com",
    registry: "https://registry.npmmirror.com/",
  },
  {
    id: "npmMirror",
    title: "npmMirror",
    subtitle: "https://skimdb.npmjs.com/",
    registry: "https://skimdb.npmjs.com/registry/",
  },
];
