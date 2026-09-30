import { getPreferenceValues, getDefaultApplication, open } from "@raycast/api";

export default async function openFeishuURL(path: string) {
  const preference = getPreferenceValues<{ appType: "feishu" | "lark" }>();
  const host = {
    feishu: "https://www.feishu.cn",
    lark: "https://www.larksuite.com",
  }[preference.appType];
  const feishuURL = host + path;
  const defaultApplication = await getDefaultApplication(feishuURL);
  await open(`${feishuURL}`, `${defaultApplication.bundleId}`);
}
