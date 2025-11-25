import { Detail, getPreferenceValues, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { login as apiLogin, fetchAttendanceData } from "./services/api";
import {
  readCookie,
  saveCookie,
  clearCookie,
  getCurrentPeriod,
  calculateWorkHour,
  encryptPassword,
  parseDailyAttendance,
  formatTime,
  formatDateWithWeekday,
} from "./utils";
import type { Preferences, WorkHourStats, DailyAttendance } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkHourStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyAttendance[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    fetchWorkHourData();
  }, []);

  async function fetchWorkHourData() {
    try {
      setIsLoading(true);
      setError(null);

      // 尝试从本地获取 Cookie
      let cookie = await readCookie();

      // 如果没有 Cookie，则登录获取
      if (!cookie) {
        console.log("本地无 Cookie，正在登录...");
        const encryptedPassword = encryptPassword(preferences.password);
        cookie = await apiLogin(preferences.phoneNumber, encryptedPassword);

        if (!cookie) {
          throw new Error("登录失败，请检查账号密码");
        }

        await saveCookie(cookie);
      }

      // 获取考勤数据
      const period = getCurrentPeriod();
      const targetHour = preferences.targetHour ? parseFloat(preferences.targetHour) : 9.5;

      try {
        const response = await fetchAttendanceData(preferences.uid, preferences.userText, period, cookie);
        const workHourStats = calculateWorkHour(response, targetHour);
        const daily = parseDailyAttendance(response);
        setStats(workHourStats);
        setDailyData(daily);
      } catch (err) {
        // 如果获取数据失败，可能是 Cookie 过期，清除并重试
        console.log("获取数据失败，可能是 Cookie 过期，正在重新登录...", err);
        await clearCookie();

        const encryptedPassword = encryptPassword(preferences.password);
        cookie = await apiLogin(preferences.phoneNumber, encryptedPassword);
        if (!cookie) {
          throw new Error("重新登录失败");
        }

        await saveCookie(cookie);
        const response = await fetchAttendanceData(preferences.uid, preferences.userText, period, cookie);
        const workHourStats = calculateWorkHour(response, targetHour);
        const daily = parseDailyAttendance(response);
        setStats(workHourStats);
        setDailyData(daily);
      }
    } catch (err) {
      console.error("获取工时数据失败：", err);
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  }

  function getMarkdown(): string {
    if (error) {
      return `# ❌ 获取失败\n\n${error}\n\n请检查网络连接和账号配置。`;
    }

    if (!stats) {
      return "# 加载中...\n\n正在获取工时数据...";
    }

    const targetHour = preferences.targetHour ? parseFloat(preferences.targetHour) : 9.5;
    const period = getCurrentPeriod();

    // 生成每日考勤表格
    let dailyTable = "";
    if (dailyData.length > 0) {
      dailyTable = `
## 📅 每日考勤明细

| 日期 | 上班打卡 | 下班打卡 | 工时 | 状态 |
|------|----------|----------|------|------|
`;
      dailyData.forEach((day) => {
        const dateStr = formatDateWithWeekday(day.date);
        const firstCard = formatTime(day.firstCard);
        const lastCard = formatTime(day.lastCard);
        const hours = day.workHours > 0 ? day.workHours.toFixed(2) : "--";
        const status = day.isLate ? "🔴 迟到" : day.workHours > 0 ? "✅ 正常" : "⚪️ 无数据";
        dailyTable += `| ${dateStr} | ${firstCard} | ${lastCard} | ${hours}h | ${status} |\n`;
      });
    }

    return `# 📊 工时统计

## 考勤周期
${period}

## 统计数据

- **平均工时**: ${stats.avg.toFixed(2)} 小时/天
- **目标工时**: ${targetHour} 小时/天
- **差异**: ${stats.delta >= 0 ? "+" : ""}${stats.delta.toFixed(2)} 小时
- **迟到次数**: ${stats.lateCount} 次

---

${stats.delta >= 0 ? "🐟 超出目标，继续保持！" : "😭 不足目标，加油努力！"}
${stats.lateCount > 0 ? `\n🫵 本周期已迟到 ${stats.lateCount} 次，请注意！` : ""}

${dailyTable}
`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          <Action title="刷新" onAction={fetchWorkHourData} />
        </ActionPanel>
      }
    />
  );
}
