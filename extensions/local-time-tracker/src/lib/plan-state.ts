import { createDailyPlan } from "./plan-model";
import { getActiveTimer, getPlans, getProjects, getWorkLogs } from "./storage";

export async function loadPlanData(date: string) {
  const [goals, dayGoals, projects, logs, timer] = await Promise.all([
    getPlans(),
    getPlans(date),
    getProjects(),
    getWorkLogs(),
    getActiveTimer(),
  ]);
  return { goals, dayGoals, projects, logs, timer };
}

export async function readDailyPlan(date: string) {
  return createDailyPlan(await loadPlanData(date), date);
}
