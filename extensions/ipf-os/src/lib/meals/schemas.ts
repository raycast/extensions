import { z } from "zod";

export const mealId = z.string().regex(/^\d+$/);
export const weekday = z.number().int().min(1).max(5);

const selectionDay = z.object({
  day: weekday,
  main_id: mealId.nullable(),
  side_id: mealId.nullable(),
  main_name: z.string().nullable(),
  side_name: z.string().nullable(),
});

export const selectionSchema = z.object({
  id: mealId,
  weekly_plan_id: mealId,
  week_start: z.string(),
  submitted_at: z.string(),
  items: z.array(selectionDay),
});

export type MealSelection = z.infer<typeof selectionSchema>;
export const selectionResultSchema = z
  .discriminatedUnion("hasSelection", [
    z.object({ hasSelection: z.literal(false) }),
    z.object({ hasSelection: z.literal(true), selection: selectionSchema }),
  ])
  .transform((result) => (result.hasSelection ? result.selection : null));

export const historySchema = z.array(selectionSchema.extend({ cancelled: z.boolean() }));
export type HistorySelection = z.infer<typeof historySchema>[number];

export const windowSchema = z.object({
  phase: z.enum(["OPEN", "GRACE", "CLOSED"]),
  opensAt: z.string(),
  closesAt: z.string(),
  graceClosesAt: z.string(),
  nextWindowOpen: z.string(),
  weeklyPlanId: mealId.nullable(),
  canSubmit: z.boolean(),
  userAvailable: z.boolean(),
  reason: z.string().nullable(),
  overrideActive: z.boolean(),
  override: z.object({ reason: z.string(), opens_at: z.string(), closes_at: z.string() }).nullable(),
});
export type SelectionWindow = z.infer<typeof windowSchema>;

export const targetSchema = z.object({ id: mealId, week_start: z.string() });
export type MealTarget = z.infer<typeof targetSchema>;

export const dashboardSchema = z.object({
  windowStatus: windowSchema,
  nextWeekPlan: targetSchema.nullable(),
  myCurrentSelection: selectionResultSchema,
  myNextSelection: selectionResultSchema,
});
export type MealsDashboard = z.infer<typeof dashboardSchema>;

export const profileSchema = z.object({
  id: mealId,
  isAvailableNextWeek: z.boolean(),
  reminders: z.boolean(),
  reminder_channel: z.enum(["email", "telegram", "both"]),
});
export type MealsProfile = z.infer<typeof profileSchema>;

export const menuOptionSchema = z.object({
  day: weekday,
  id: mealId,
  name: z.string(),
  role: z.enum(["main", "side"]),
  special: z.boolean(),
  description: z.string().nullable(),
  note: z.string().nullable(),
});
export type MenuOption = z.infer<typeof menuOptionSchema>;

export const menuSchema = z
  .object({
    id: mealId,
    week_start: z.string(),
    weekly_plan_items: z.array(
      z.object({
        day_of_week: weekday,
        meal_id: mealId,
        name: z.string(),
        meal_role: z.enum(["main", "side"]),
        isSpecial: z.boolean(),
        description: z.string().nullable(),
        note: z.string().nullable(),
      }),
    ),
  })
  .transform((menu) => ({
    id: menu.id,
    week_start: menu.week_start,
    items: menu.weekly_plan_items.map((item) => ({
      day: item.day_of_week,
      id: item.meal_id,
      name: item.name,
      role: item.meal_role,
      special: item.isSpecial,
      description: item.description,
      note: item.note,
    })),
  }));
export type MealsMenu = z.infer<typeof menuSchema>;

export const menuItemsSchema = z
  .array(
    z.object({
      day_of_week: weekday,
      meal_id: mealId,
      meal_role: z.enum(["main", "side"]),
      note: z.string().nullable(),
      meals: z.object({ name: z.string(), isSpecial: z.boolean(), description: z.string().nullable() }),
    }),
  )
  .transform((items) =>
    items.map((item) => ({
      day: item.day_of_week,
      id: item.meal_id,
      name: item.meals.name,
      role: item.meal_role,
      special: item.meals.isSpecial,
      description: item.meals.description,
      note: item.note,
    })),
  );

export const compatibilitySchema = z.array(
  z.object({
    main_meal_id: mealId,
    side_meal_id: mealId,
    allowed: z.boolean(),
  }),
);
export type CompatibilityRule = z.infer<typeof compatibilitySchema>[number];

export const absenceSchema = z.object({
  date: z.string(),
  notifiedAt: z.string(),
  onTime: z.boolean(),
  reason: z.string().nullable(),
});
export type AbsenceNotice = z.infer<typeof absenceSchema>;

export const popularSchema = z.object({
  selections: z.array(z.object({ day: weekday, main_id: mealId, side_id: mealId.nullable() })),
});
export const recentSchema = z.object({
  valid: z.array(
    z.object({
      day: weekday,
      main: z.object({ id: mealId, name: z.string() }),
      side: z.object({ id: mealId, name: z.string() }).nullable(),
    }),
  ),
  invalid: z.array(z.object({ day: weekday, reason: z.string() })),
  notSelected: z.array(weekday),
  matchPercentage: z.number(),
});

export const dayChoiceSchema = z.discriminatedUnion("state", [
  z.object({ day: weekday, state: z.literal("unselected"), mainId: z.null(), sideId: z.null() }),
  z.object({ day: weekday, state: z.literal("skipped"), mainId: z.null(), sideId: z.null() }),
  z.object({ day: weekday, state: z.literal("selected"), mainId: mealId, sideId: mealId.nullable() }),
]);
export type DayChoice = z.infer<typeof dayChoiceSchema>;
export const draftSchema = z.object({
  planId: mealId,
  weekStart: z.string(),
  baseline: z.string(),
  updatedAt: z.string(),
  days: z.array(dayChoiceSchema).length(5),
  warnings: z.array(z.object({ day: weekday, message: z.string() })),
});
export type MealDraft = z.infer<typeof draftSchema>;
