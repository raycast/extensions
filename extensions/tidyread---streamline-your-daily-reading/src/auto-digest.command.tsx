import { LaunchProps, LaunchType, Toast, environment, showToast, updateCommandMetadata } from "@raycast/api";
import { sendNotification } from "./utils/notify";
import { normalizePreference } from "./utils/preference";
import * as chrono from "chrono-node";
import { bizGenDigest, categorizeSources, isValidNotificationTime } from "./utils/biz";
import { isAfter, subMinutes } from "date-fns";
import { NO_API_KEY, NO_FEEDS, matchError } from "./utils/error";
import { retry } from "./utils/util";
import { getLastNotifyTime, getSources, checkTodaysDigestExist, saveLastNotifyTime } from "./store";
import dayjs from "dayjs";

async function handleGenDigest(onSuccess: () => void = () => {}, enableError: boolean = false) {
  try {
    console.log("start to gen digest...");
    await bizGenDigest();
    await onSuccess();
  } catch (err: any) {
    if (!enableError) return;
    // 已没有抛出此错误，不会走到此逻辑
    if (matchError(err, NO_API_KEY)) {
      await sendNotification({
        title: "Daily Digest Success",
        message: "View 'Daily Read' command to see today's digest.",
      });
      return;
    }

    if (matchError(err, NO_FEEDS)) {
      await sendNotification({
        title: "Daily Digest Failed",
        message: "No RSS link found in today's sources, please add some and try again.",
      });
      return;
    }

    if (matchError(err, "ECONNRESET")) {
      await sendNotification({
        title: "Daily Digest Failed",
        message: "Check your network and try again.",
      });
      return;
    }

    if (matchError(err, "timed out")) {
      await sendNotification({
        title: "Daily Digest Failed",
        message: "Check your network, or add http proxy and try again.",
      });
      return;
    }

    await sendNotification({
      title: "Daily Digest Failed",
      message: `${err.message.slice(0, 100)}...`,
    });
  }
}

async function handleSuccess() {
  await sendNotification({
    title: "Daily Digest Success",
    message: "View 'Daily Read' command to see today's digest.",
  });

  await updateCommandMetadata({
    subtitle: `Last auto digest at: ${dayjs().format("YYYY-MM-DD HH:mm")}`,
  });
}

export default async function Command(props: LaunchProps<{ launchContext: { regenerate: boolean } }>) {
  const regenerate = props?.launchContext?.regenerate ?? false;
  const sources = await getSources();
  const { todayItems } = categorizeSources(sources);
  const { notificationTime } = normalizePreference();

  if (environment.launchType === LaunchType.UserInitiated) {
    showToast(Toast.Style.Success, `Activited!🥳 Your daily digest will automatically generate at ${notificationTime}`);
  }

  // 若没有当日read，则无需通知
  if (todayItems.length === 0) return;

  const lastNotifyTime = await getLastNotifyTime();

  console.log("lastNotifyTime:", lastNotifyTime);

  if (lastNotifyTime) {
    const diffDays = dayjs().startOf("day").diff(dayjs(lastNotifyTime).startOf("day"), "day");

    console.log("diffDays:", diffDays);

    // 若当日已通知过，则不再通知
    const hasNotified = diffDays === 0;

    console.log("notified:", hasNotified);

    if (hasNotified) {
      return;
    }
  } else {
    console.log("notified: false");
  }

  const now = new Date();
  const formattedTime = (
    !isValidNotificationTime(notificationTime) ? chrono.parseDate("9am", now) : chrono.parseDate(notificationTime, now)
  )!;

  const preTime = subMinutes(formattedTime, 10);

  // 到了notificationTime，检测是否有当日的digest，若没有，则生成，失败则通知生成失败。若有，若是用户手动生成的，则通知已手动生成；若是自动生成的，则通知自动生成
  if (isAfter(now, formattedTime)) {
    const todaysDigestExist = await checkTodaysDigestExist();

    console.log("todaysDigestExist:", todaysDigestExist);

    if (!todaysDigestExist || regenerate) {
      await handleGenDigest(async () => {
        await handleSuccess();
      }, true);
    } else {
      if (await checkTodaysDigestExist("auto")) {
        console.log(`is today's digest auto generate: true`);
        await handleSuccess();
      } else {
        console.log(`is today's digest auto generate: false`);
        await sendNotification({
          title: "Daily Digest Success",
          message: "You have generated it manually yourself, go to the 'Daily Read' command and check it out.",
        });
      }
    }

    await saveLastNotifyTime(+now);
  } else if (isAfter(now, preTime)) {
    // 若到了notificationTime的前10分钟，若没有当日digest，则开始生成digest；且反复重试
    if (!(await checkTodaysDigestExist())) {
      await retry(handleGenDigest, 3, 10 * 1000);
    }
  }
}
