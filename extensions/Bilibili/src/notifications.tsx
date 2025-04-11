import { formatUrl } from "./utils";
import { checkLogin, getDynamicFeed } from "./apis";

import { spawnSync } from "child_process";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface Preferences {
  justNotifyVideos: boolean;
  terminalNotifierPath: string;
}
const preference: Preferences = getPreferenceValues();

function doNotify(title: string, type: Bilibili.DynamicType, subtitle: string, link: string) {
  if (preference.justNotifyVideos && type !== "DYNAMIC_TYPE_AV") return;
  if (!preference.terminalNotifierPath) {
    runAppleScript(`display notification "${subtitle}" with title "${title} - Bilibili"`);
    return;
  }

  const { status } = spawnSync(preference.terminalNotifierPath, [
    "-title",
    `${title} - Bilibili`,
    "-subtitle",
    subtitle,
    "-open",
    formatUrl(link),
    "-sound",
    "default",
  ]);

  if (status) {
    runAppleScript(`display notification "${subtitle}" with title "${title} - Bilibili"`);
  }
}

function notify(item: Bilibili.DynamicItem) {
  switch (item.type) {
    case "DYNAMIC_TYPE_AV":
      doNotify(
        item.modules.module_author.name,
        item.type,
        item.modules.module_dynamic.major.archive.title,
        item.modules.module_dynamic.major.archive.jump_url
      );
      break;
    case "DYNAMIC_TYPE_FORWARD":
    case "DYNAMIC_TYPE_WORD":
    case "DYNAMIC_TYPE_DRAW":
      doNotify(
        item.modules.module_author.name,
        item.type,
        item.modules.module_dynamic.desc.text,
        `https://www.bilibili.com/opus/${item.id_str}`
      );
      break;
    case "DYNAMIC_TYPE_MUSIC":
      doNotify(
        item.modules.module_author.name,
        item.type,
        item.modules.module_dynamic.major.music.title,
        formatUrl(item.modules.module_dynamic.major.music.jump_url)
      );
      break;
    case "DYNAMIC_TYPE_LIVE_RCMD":
      // eslint-disable-next-line no-case-declarations
      const liveDate = JSON.parse(item.modules.module_dynamic.major.live_rcmd.content);

      doNotify(
        item.modules.module_author.name,
        item.type,
        liveDate.live_play_info.title,
        formatUrl(liveDate.live_play_info.link)
      );
      break;
  }
}

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export default async function Command() {
  if (!checkLogin()) return;

  console.log("running");
  const items = await getDynamicFeed();
  const newNotifications = items.map((item) => item.id_str);
  const oldNotifications: string[] = JSON.parse((await LocalStorage.getItem("notifications")) || "[]");

  if (oldNotifications.length !== 0) {
    const startNotifyIndex = oldNotifications
      .map((oldNotifyId) => newNotifications.findIndex((newNotifyId) => newNotifyId === oldNotifyId))
      .filter((item) => item >= 0)[0];

    const unNotifies = newNotifications.slice(0, startNotifyIndex);
    for (const unNotify of unNotifies) {
      items.map(async (item) => {
        if (item.id_str === unNotify) {
          notify(item);
          await sleep(500);
        }
      });
    }
  }

  await LocalStorage.setItem("notifications", JSON.stringify(newNotifications));
}
