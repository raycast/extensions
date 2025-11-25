import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { login as apiLogin } from "./services/api";
import { saveCookie, getCurrentPeriod, encryptPassword } from "./utils";
import { fetchAttendanceData } from "./services/api";
import { calculateWorkHour, formatWorkHourStats } from "./utils";
import type { Preferences } from "./types";

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "正在获取工时数据...",
    });

    // 登录获取 Cookie
    const encryptedPassword = encryptPassword(preferences.password);
    const cookie = await apiLogin(preferences.phoneNumber, encryptedPassword);

    if (!cookie) {
      await showFailureToast("登录失败，请检查账号密码");
      return;
    }

    // 保存 Cookie
    await saveCookie(cookie);

    // 获取考勤数据
    const period = getCurrentPeriod();
    const targetHour = preferences.targetHour ? parseFloat(preferences.targetHour) : 9.5;
    const response = await fetchAttendanceData(preferences.uid, preferences.userText, period, cookie);

    // 计算工时统计
    const stats = calculateWorkHour(response, targetHour);
    const message = formatWorkHourStats(stats);

    await showHUD(message);
  } catch (error) {
    console.error("获取工时数据失败：", error);
    await showFailureToast("获取工时数据失败，请稍后重试");
  }
}
