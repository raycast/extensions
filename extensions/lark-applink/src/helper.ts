import { getPreferenceValues, open } from "@raycast/api";

export default async function openLark(path: string) {
  const preference = getPreferenceValues<{ type: "feishu" | "lark" }>();
  const host = {
    feishu: "https://applink.feishu.cn",
    lark: "https://applink.larksuite.com",
  }[preference.type];
  await open(`${host}${path}`, "com.electron.lark");
}
