import { MenuBarExtra, getPreferenceValues, Icon, open, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { login as apiLogin, fetchAttendanceData } from "./services/api";
import {
  readCookie,
  saveCookie,
  getCurrentPeriod,
  calculateWorkHour,
  encryptPassword,
  parseDailyAttendance,
  formatDate,
  formatDateWithWeekday,
} from "./utils";
import type { Preferences, WorkHourStats, DailyAttendance } from "./types";

interface MenuBarState {
  isLoading: boolean;
  error: string | null;
  stats: WorkHourStats | null;
  todayData: DailyAttendance | null;
  periodStats: {
    totalDays: number;
    workedDays: number;
  } | null;
  lastUpdateTime: number | null;
}

export default function Command() {
  const [state, setState] = useState<MenuBarState>({
    isLoading: true,
    error: null,
    stats: null,
    todayData: null,
    periodStats: null,
    lastUpdateTime: null,
  });

  const preferences = getPreferenceValues<Preferences>();
  const targetHour = parseFloat(preferences.targetHour || "9.5");
  const refreshInterval = parseInt(preferences.refreshInterval || "3600000"); // 默认1小时

  useEffect(() => {
    fetchMenuBarData();

    // 设置定时刷新，使用用户配置的间隔时间
    const interval = setInterval(fetchMenuBarData, refreshInterval);
    return () => clearInterval(interval);
  }, [preferences.phoneNumber, preferences.uid, preferences.userText, refreshInterval]);

  async function fetchMenuBarData(forceRefresh = false) {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // 创建缓存实例
      const cache = new Cache();
      const cacheKey = `workhour_data_${preferences.uid}`;
      const cachedData = cache.get(cacheKey);

      // 如果有缓存数据且不是强制刷新，直接使用（缓存不过期）
      if (cachedData && !forceRefresh) {
        const parsedData = JSON.parse(cachedData);
        setState({
          isLoading: false,
          error: null,
          stats: parsedData.stats,
          todayData: parsedData.todayData,
          periodStats: parsedData.periodStats,
          lastUpdateTime: parsedData.lastUpdateTime,
        });
        return;
      }

      // 强制刷新时清除缓存
      if (forceRefresh) {
        cache.remove(cacheKey);
      }

      // 尝试从本地获取 Cookie
      let cookie = await readCookie();

      // 如果没有 Cookie，则登录获取
      if (!cookie) {
        const encryptedPassword = encryptPassword(preferences.password);
        cookie = await apiLogin(preferences.phoneNumber, encryptedPassword);

        if (!cookie) {
          throw new Error("登录失败，请检查账号密码");
        }

        await saveCookie(cookie);
      }

      // 获取当前考勤周期数据
      const period = getCurrentPeriod();
      const response = await fetchAttendanceData(preferences.uid, preferences.userText, period, cookie);

      // 计算统计数据
      const stats = calculateWorkHour(response, targetHour);
      const dailyData = parseDailyAttendance(response);

      // 获取今日数据
      const today = formatDate(new Date());
      const todayData = dailyData.find((item) => item.date === today) || null;

      // 计算周期统计
      const totalDays = dailyData.length;
      const workedDays = dailyData.filter((item) => item.workHours > 0).length;

      const now = Date.now();
      const newState = {
        isLoading: false,
        error: null,
        stats,
        todayData,
        periodStats: { totalDays, workedDays },
        lastUpdateTime: now,
      };

      setState(newState);

      // 缓存数据（不过期）
      cache.set(
        cacheKey,
        JSON.stringify({
          stats,
          todayData,
          periodStats: { totalDays, workedDays },
          lastUpdateTime: now,
        }),
      );
    } catch (error) {
      console.error("获取菜单栏数据失败:", error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "获取数据失败",
        stats: null,
        todayData: null,
        periodStats: null,
        lastUpdateTime: null,
      });
    }
  }

  function getMenuBarTitle(): string {
    if (state.isLoading) return "⏳";
    if (state.error) return "❌";
    if (state.todayData) {
      const hours = state.todayData.workHours;
      if (hours > 0) {
        return `${hours.toFixed(1)}h`;
      }
    }
    return "🏢";
  }

  function getMenuBarTooltip(): string {
    if (state.isLoading) return "正在加载工时数据...";
    if (state.error) return `获取失败: ${state.error}`;
    if (state.todayData) {
      const today = formatDateWithWeekday(state.todayData.date);
      const hours = state.todayData.workHours;
      const status = state.todayData.isLate ? " (迟到)" : "";
      return `${today} 工时: ${hours.toFixed(2)}小时${status}`;
    }
    return "工作时长统计";
  }

  function getLastUpdateTime(): string {
    if (!state.lastUpdateTime) return "未知";

    const updateTime = new Date(state.lastUpdateTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));

    // 如果是1小时内，显示"X分钟前"
    if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    }

    // 如果是24小时内，显示"X小时前"
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}小时前`;
    }

    // 超过24小时显示具体时间
    const month = (updateTime.getMonth() + 1).toString().padStart(2, "0");
    const day = updateTime.getDate().toString().padStart(2, "0");
    const hours = updateTime.getHours().toString().padStart(2, "0");
    const minutes = updateTime.getMinutes().toString().padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}`;
  }

  if (state.error && !state.stats) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} title="❌" tooltip={`获取失败: ${state.error}`}>
        <MenuBarExtra.Item title="重试" icon={Icon.ArrowClockwise} onAction={fetchMenuBarData} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="打开详细页面"
          icon={Icon.Document}
          onAction={() => open("raycast://extensions/meunicorn/working-hour/get-working-hour")}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={Icon.Clock} title={getMenuBarTitle()} tooltip={getMenuBarTooltip()} isLoading={state.isLoading}>
      {/* 今日工时 */}
      <MenuBarExtra.Section title="今日">
        {state.todayData ? (
          <>
            <MenuBarExtra.Item
              title={`工时: ${state.todayData.workHours.toFixed(2)}小时`}
              subtitle={state.todayData.isLate ? "⚠️ 迟到" : "✅ 正常"}
              icon={state.todayData.isLate ? Icon.ExclamationMark : Icon.Checkmark}
            />
            {state.todayData.firstCard && (
              <MenuBarExtra.Item title={`上班: ${state.todayData.firstCard.split(" ")[1]}`} icon={Icon.ArrowUp} />
            )}
            {state.todayData.lastCard && (
              <MenuBarExtra.Item title={`下班: ${state.todayData.lastCard.split(" ")[1]}`} icon={Icon.ArrowDown} />
            )}
          </>
        ) : (
          <MenuBarExtra.Item title="暂无今日数据" icon={Icon.Minus} />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {/* 周期统计 */}
      <MenuBarExtra.Section title="当前周期">
        {state.stats && state.periodStats ? (
          <>
            <MenuBarExtra.Item
              title={`平均工时: ${state.stats.avg.toFixed(2)}小时`}
              subtitle={`目标: ${targetHour}小时`}
              icon={state.stats.avg >= targetHour ? Icon.Checkmark : Icon.ExclamationMark}
            />
            <MenuBarExtra.Item
              title={
                state.stats.delta >= 0
                  ? `超出目标: +${state.stats.delta.toFixed(2)}小时`
                  : `不足目标: ${state.stats.delta.toFixed(2)}小时`
              }
              icon={state.stats.delta >= 0 ? Icon.ArrowUp : Icon.ArrowDown}
            />
            <MenuBarExtra.Item title={`迟到次数: ${state.stats.lateCount}次`} icon={Icon.Clock} />
            <MenuBarExtra.Item
              title={`工作天数: ${state.periodStats.workedDays}/${state.periodStats.totalDays}天`}
              icon={Icon.Calendar}
            />
          </>
        ) : (
          <MenuBarExtra.Item title="统计数据加载中..." icon={Icon.Clock} />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {/* 数据信息 */}
      <MenuBarExtra.Section title="数据信息">
        <MenuBarExtra.Item title={`${getLastUpdateTime()} 更新`} icon={Icon.Clock} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {/* 操作 */}
      <MenuBarExtra.Section title="操作">
        <MenuBarExtra.Item
          title="刷新数据"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => fetchMenuBarData(true)}
        />
        <MenuBarExtra.Item
          title="快速查看 (HUD)"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "q" }}
          onAction={() => open("raycast://extensions/meunicorn/working-hour/quick-view-working-hour")}
        />
        <MenuBarExtra.Item
          title="详细统计"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => open("raycast://extensions/meunicorn/working-hour/get-working-hour")}
        />
        <MenuBarExtra.Item
          title="配置设置"
          icon={Icon.Gear}
          onAction={() => open("raycast://extensions/meunicorn/working-hour/")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
