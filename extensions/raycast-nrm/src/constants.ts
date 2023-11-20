export interface IRegistrySourceItem {
  id: string;
  title: string;
  subtitle: string;
  registry: string;
}

export const USER_HOME: string = process.env.HOME || process.env.USERPROFILE || `/Users/${process.env.USER}`;

export const GIST_TOKEN: string = "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";

export const GIST_ID: string = "bafad768c908871a689c020cc405c81e";

export const DEFAULT_REGISTRY_SOURCES: IRegistrySourceItem[] = [
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
