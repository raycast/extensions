import { useCallback, useEffect, useRef, useState } from "react";
import { showFailure } from "../lib/errors";
import { createDailyPlan, planClockKey, type PlanData } from "../lib/plan-model";
import { loadPlanData } from "../lib/plan-state";

export function useDailyPlan(date: string) {
  const [saved, setSaved] = useState<{ date: string; data: PlanData }>();
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const currentDate = useRef(date);
  currentDate.current = date;
  const latest = useRef<{ date: string; data: PlanData } | undefined>(undefined);
  const dataKey = useRef("");
  const clockKey = useRef("");
  const request = useRef(0);
  const reading = useRef(false);
  const mutating = useRef(false);
  const reload = useCallback(async () => {
    const id = ++request.current;
    reading.current = true;
    try {
      const data = await loadPlanData(date);
      if (mounted.current && id === request.current && currentDate.current === date) {
        const key = `${date}:${JSON.stringify(data)}`;
        latest.current = { date, data };
        if (key !== dataKey.current) {
          dataKey.current = key;
          const instant = new Date();
          clockKey.current = planClockKey(data, date, instant);
          setNow(instant);
          setSaved({ date, data });
        }
        setError(undefined);
      }
    } catch (reason) {
      if (mounted.current && id === request.current && currentDate.current === date)
        setError(reason instanceof Error ? reason.message : "Could not load the plan");
    } finally {
      if (id === request.current) reading.current = false;
    }
  }, [date]);
  useEffect(() => {
    mounted.current = true;
    setError(undefined);
    void reload();
    const clock = setInterval(() => {
      const current = latest.current;
      if (!current || current.date !== date) return;
      const instant = new Date();
      const key = planClockKey(current.data, date, instant);
      if (key !== clockKey.current) {
        clockKey.current = key;
        setNow(instant);
      }
    }, 1000);
    const poll = setInterval(() => {
      if (!mutating.current && !reading.current) void reload();
    }, 3000);
    return () => {
      mounted.current = false;
      request.current++;
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [reload]);
  async function perform<T>(title: string, operation: () => Promise<T>): Promise<{ value: T } | undefined> {
    if (mutating.current || error || saved?.date !== date) return;
    mutating.current = true;
    setBusy(true);
    try {
      const value = await operation();
      await reload();
      return { value };
    } catch (reason) {
      await showFailure(title, reason);
      await reload();
    } finally {
      mutating.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    plan: saved?.date === date ? createDailyPlan(saved.data, date, now) : undefined,
    busy,
    error,
    now,
    reload,
    perform,
  };
}
