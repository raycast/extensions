import { Icon } from "@raycast/api";
import { Achievement, FocusLog } from "../types/index";

export const STORAGE_KEYS = {
  FOCUS_LOG: "focusLog",
  PERSONAL_BEST: "personalBest",
  FLOW_STATE: "flowState",
};

export const ACTIVITY_COMPARISONS = [
  { activity: "👁️ Blinking", time: 0.025 },
  { activity: "☕ Sipping a cup of coffee", time: 5 },
  { activity: "🎵 Listening to a song", time: 3 },
  { activity: "📹 Watching a short video", time: 10 },
  { activity: "🚶 Taking a short walk", time: 15 },
  { activity: "📖 Reading a chapter", time: 30 },
  { activity: "😴 Power nap", time: 20 },
  { activity: "🍳 Cooking a meal", time: 60 },
  { activity: "💻 Coding session", time: 90 },
  { activity: "🏋️‍♂️ Workout", time: 120 },
  { activity: "🧘‍♂️ Flow Pro", time: 180 },
  { activity: "💼 Flow Master", time: 240 },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_session",
    title: "First Session",
    description: "Complete your first focus session",
    icon: Icon.Trophy,
    unlocked: false,
    condition: (focusLog) => focusLog.totalTime > 0,
  },
  {
    id: "10_hours",
    title: "10 Hours Focused",
    description: "Reach 10 hours of total focus time",
    icon: Icon.Clock,
    unlocked: false,
    condition: (focusLog) => focusLog.totalTime >= 10 * 60 * 60, // 10 hours
  },
  {
    id: "50_hours",
    title: "50 Hours Focused",
    description: "Reach 50 hours of total focus time",
    icon: Icon.Clock,
    unlocked: false,
    condition: (focusLog) => focusLog.totalTime >= 50 * 60 * 60, // 50 hours
  },
  {
    id: "100_hours",
    title: "100 Hours Focused",
    description: "Reach 100 hours of total focus time",
    icon: Icon.Clock,
    unlocked: false,
    condition: (focusLog) => focusLog.totalTime >= 100 * 60 * 60, // 100 hours
  },
  {
    id: "250_hours",
    title: "250 Hours Focused",
    description: "Reach 250 hours of total focus time",
    icon: Icon.Clock,
    unlocked: false,
    condition: (focusLog) => focusLog.totalTime >= 250 * 60 * 60, // 250 hours
  },
  {
    id: "first_streak",
    title: "First Streak",
    description: "Complete a streak of 3 consecutive days of focus",
    icon: Icon.Star,
    unlocked: false,
    condition: (focusLog) => calculateLongestStreak(focusLog) >= 3,
  },
  {
    id: "week_streak",
    title: "7-Day Streak",
    description: "Complete 7 consecutive days of focus sessions",
    icon: Icon.Star,
    unlocked: false,
    condition: (focusLog) => calculateLongestStreak(focusLog) >= 7,
  },
  {
    id: "30_day_streak",
    title: "30-Day Streak",
    description: "Complete 30 consecutive days of focus sessions",
    icon: Icon.Star,
    unlocked: false,
    condition: (focusLog) => calculateLongestStreak(focusLog) >= 30,
  },
  {
    id: "50_sessions",
    title: "50 Sessions",
    description: "Complete 50 focus sessions",
    icon: Icon.List,
    unlocked: false,
    condition: (focusLog) => focusLog.dailyLogs.reduce((acc, log) => acc + log.sessions.length, 0) >= 50,
  },
  {
    id: "100_sessions",
    title: "100 Sessions",
    description: "Complete 100 focus sessions",
    icon: Icon.List,
    unlocked: false,
    condition: (focusLog) => focusLog.dailyLogs.reduce((acc, log) => acc + log.sessions.length, 0) >= 100,
  },
  {
    id: "10_sessions",
    title: "10 Sessions",
    description: "Complete 10 focus sessions",
    icon: Icon.List,
    unlocked: false,
    condition: (focusLog) => focusLog.dailyLogs.reduce((acc, log) => acc + log.sessions.length, 0) >= 10,
  },
  {
    id: "250_sessions",
    title: "250 Sessions",
    description: "Complete 250 focus sessions",
    icon: Icon.List,
    unlocked: false,
    condition: (focusLog) => focusLog.dailyLogs.reduce((acc, log) => acc + log.sessions.length, 0) >= 250,
  },
  {
    id: "1000_sessions",
    title: "1000 Sessions",
    description: "Complete 1000 focus sessions",
    icon: Icon.List,
    unlocked: false,
    condition: (focusLog) => focusLog.dailyLogs.reduce((acc, log) => acc + log.sessions.length, 0) >= 1000,
  },
  {
    id: "weekend_warrior",
    title: "Weekend Warrior",
    description: "Complete a focus session on both Saturday and Sunday",
    icon: Icon.Calendar,
    unlocked: false,
    condition: (focusLog) => {
      const weekendSessions = focusLog.dailyLogs.filter(
        (log) => new Date(log.date).getDay() === 6 || new Date(log.date).getDay() === 0,
      );
      return weekendSessions.length >= 2;
    },
  },
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Complete a session before 9 AM",
    icon: Icon.Sun,
    unlocked: false,
    condition: (focusLog) => {
      const earlySessions = focusLog.dailyLogs.filter((log) => {
        const sessionStartTime = new Date(log.date).getHours();
        return sessionStartTime < 9;
      });
      return earlySessions.length > 0;
    },
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Complete a session after 9 PM",
    icon: Icon.Moon,
    unlocked: false,
    condition: (focusLog) => {
      const nightSessions = focusLog.dailyLogs.filter((log) => {
        const sessionStartTime = new Date(log.date).getHours();
        return sessionStartTime >= 21;
      });
      return nightSessions.length > 0;
    },
  },
  {
    id: "flow_pro",
    title: "Flow Pro",
    description: "Achieve a total focus time of 3 hours in one day",
    icon: Icon.Cloud,
    unlocked: false,
    condition: (focusLog) => {
      return focusLog.dailyLogs.some((log) => {
        const totalTime = log.sessions.reduce((acc, session) => acc + session.duration, 0); // Assuming each session has a 'duration' property
        return totalTime >= 3 * 60 * 60; // 3 hours
      });
    },
  },
  {
    id: "master_of_focus",
    title: "Master of Focus",
    description: "Achieve 5 hours of focus time in one day",
    icon: Icon.Cloud,
    unlocked: false,
    condition: (focusLog) => {
      return focusLog.dailyLogs.some((log) => {
        const totalTime = log.sessions.reduce((acc, session) => acc + session.duration, 0); // Assuming each session has a 'duration' property
        return totalTime >= 5 * 60 * 60; // 5 hours
      });
    },
  },
  {
    id: "incredible_focus",
    title: "Incredible Focus",
    description: "Achieve 10 hours of focus time in one day",
    icon: Icon.Cloud,
    unlocked: false,
    condition: (focusLog) => {
      return focusLog.dailyLogs.some((log) => {
        const totalTime = log.sessions.reduce((acc, session) => acc + session.duration, 0); // Assuming each session has a 'duration' property
        return totalTime >= 10 * 60 * 60; // 10 hours
      });
    },
  },
];

function calculateLongestStreak(focusLog: FocusLog): number {
  if (focusLog.dailyLogs.length === 0) return 0;

  let currentStreak = 1;
  let maxStreak = 1;
  const sortedDates = focusLog.dailyLogs.map((log) => new Date(log.date).getTime()).sort((a, b) => a - b);

  for (let i = 1; i < sortedDates.length; i++) {
    const dayDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}
