import { z } from "zod";
import { requestParsed } from "./client";
import {
  absenceSchema,
  compatibilitySchema,
  dashboardSchema,
  historySchema,
  menuItemsSchema,
  menuSchema,
  popularSchema,
  profileSchema,
  recentSchema,
  selectionResultSchema,
} from "../meals/schemas";
import type { DayChoice } from "../meals/schemas";

export const getMealsDashboard = () => requestParsed({ path: "/staff/dashboard-data" }, dashboardSchema.parse);
export const getMealsProfile = () => requestParsed({ path: "/staff/profile" }, profileSchema.parse);
export const getMealsMenu = (week: "current" | "next") =>
  requestParsed({ path: `/staff/weekly-plans/${week}` }, menuSchema.nullable().parse);
export const getMealOptions = (planId: string) =>
  requestParsed({ path: `/staff/weekly-plans/${planId}/items` }, menuItemsSchema.parse);
export const getMealCompatibility = () => requestParsed({ path: "/staff/compatibility" }, compatibilitySchema.parse);
export const getMealsHistory = () => requestParsed({ path: "/staff/selections/history" }, historySchema.parse);
export const getNextMealSelection = () =>
  requestParsed({ path: "/staff/selections/my-next" }, selectionResultSchema.parse);
export const getAbsences = (from: string, to: string) =>
  requestParsed({ path: "/staff/absences", query: { from, to } }, z.array(absenceSchema).parse);
export const notifyAbsence = (date: string, reason: string) =>
  requestParsed({ method: "POST", path: "/staff/absences", body: { date, reason } }, absenceSchema.parse);

export const getPopularMeals = (planId: string) =>
  requestParsed(
    { method: "POST", path: "/staff/quick-fill/popular", body: { nextWeekPlanId: planId } },
    popularSchema.parse,
  );
export const getRecentMeals = (planId: string) =>
  requestParsed(
    { method: "POST", path: "/staff/quick-fill/copy-week", body: { nextWeekPlanId: planId } },
    recentSchema.parse,
  );

export const saveMealSelection = (planId: string, days: DayChoice[]) =>
  requestParsed(
    {
      method: "POST",
      path: "/staff/selections",
      body: {
        weeklyPlanId: planId,
        selections: days
          .filter((day) => day.state === "selected")
          .map((day) => ({ day: day.day, meals: day.sideId ? [day.mainId, day.sideId] : [day.mainId] })),
      },
    },
    selectionResultSchema.parse,
  );

export const cancelMealSelection = (planId: string) =>
  requestParsed({ method: "DELETE", path: `/staff/selections/${planId}` }, z.object({ success: z.boolean() }).parse);
export const setMealAvailability = (available: boolean, weekStart: string, deleteSubmission = false) =>
  requestParsed(
    {
      method: "PUT",
      path: "/staff/profile/availability",
      body: {
        isAvailableNextWeek: available,
        unavailable_week_start: available ? null : weekStart.slice(0, 10),
        deleteSubmission,
      },
    },
    z.union([
      z.object({ requiresConfirmation: z.literal(true), message: z.string() }),
      z.object({ success: z.boolean(), user: profileSchema }),
    ]).parse,
  );
export const setMealReminders = (reminders: boolean) =>
  requestParsed(
    { method: "PUT", path: "/staff/profile/reminders", body: { reminders } },
    z.object({ success: z.boolean(), user: profileSchema }).parse,
  );
