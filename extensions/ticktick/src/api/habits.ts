import { apiGet, apiPost } from "./client";
import { Habit, HabitCheckin } from "../types/ticktick";
import { format } from "date-fns";
import { formatTickTickTime } from "../utils/time";

interface HabitCheckinsQueryResponse {
  checkins: HabitCheckin[];
}

interface V1HabitCheckinResponse {
  habitId: string;
  checkins?: Array<{ stamp: number; value: number; goal: number }>;
}

export async function getHabits(): Promise<Habit[]> {
  try {
    return await apiGet<Habit[]>("/open/v1/habit");
  } catch {
    return apiGet<Habit[]>("/api/v2/habits");
  }
}

export async function checkinHabit(habitId: string, date?: Date): Promise<void> {
  const d = date ?? new Date();
  const stampDate = format(d, "yyyyMMdd");
  const stamp = parseInt(stampDate, 10);

  try {
    await apiPost(`/open/v1/habit/${habitId}/checkin`, {
      stamp,
      value: 1.0,
      goal: 1.0,
      time: formatTickTickTime(d),
      opTime: formatTickTickTime(d),
      status: 2,
    });
    return;
  } catch {
    // V2 fallback
  }

  await apiPost("/api/v2/habitCheckins/batch", {
    checkins: [
      {
        habitId,
        stampDate,
        status: 2,
        value: 1,
        checkinTime: d.toISOString(),
      },
    ],
  });
}

export async function uncheckinHabit(habitId: string, date?: Date): Promise<void> {
  const d = date ?? new Date();
  const stampDate = format(d, "yyyyMMdd");
  const stamp = parseInt(stampDate, 10);

  try {
    await apiPost(`/open/v1/habit/${habitId}/checkin`, {
      stamp,
      value: 0,
      goal: 1.0,
      time: formatTickTickTime(d),
      opTime: formatTickTickTime(d),
      status: 0,
    });
    return;
  } catch {
    // V2 fallback
  }

  await apiPost("/api/v2/habitCheckins/batch", {
    checkins: [
      {
        habitId,
        stampDate,
        status: 0,
        value: 0,
        checkinTime: d.toISOString(),
      },
    ],
  });
}

export async function createHabit(name: string, color?: string, goal = 1): Promise<Habit> {
  try {
    return await apiPost<Habit>("/open/v1/habit", { name, color, goal, step: 1 });
  } catch {
    const result = await apiPost<{ add?: Habit[] }>("/api/v2/habits/batch", {
      add: [{ name, color, goal, step: 1 }],
    });
    return result?.add?.[0] ?? ({ id: "", name, goal, step: 1, status: 0 } as Habit);
  }
}

export async function getHabitCheckins(habitIds: string[], daysBack = 7): Promise<HabitCheckin[]> {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const fromStamp = parseInt(format(afterDate, "yyyyMMdd"), 10);
  const toStamp = parseInt(format(new Date(), "yyyyMMdd"), 10);

  try {
    const ids = habitIds.join(",");
    const response = await apiGet<V1HabitCheckinResponse[]>(
      `/open/v1/habit/checkins?habitIds=${encodeURIComponent(ids)}&from=${fromStamp}&to=${toStamp}`,
    );
    const checkins: HabitCheckin[] = [];
    for (const item of response ?? []) {
      for (const c of item.checkins ?? []) {
        checkins.push({
          habitId: item.habitId,
          stampDate: String(c.stamp),
          value: c.value,
          goal: c.goal,
          status: c.value > 0 ? 2 : 0,
        });
      }
    }
    return checkins;
  } catch {
    // V2 fallback
  }

  const afterStamp = format(afterDate, "yyyyMMdd");
  const response = await apiPost<HabitCheckinsQueryResponse>("/api/v2/habitCheckins/query", {
    habitIds,
    afterStamp,
  });
  return response?.checkins ?? [];
}
