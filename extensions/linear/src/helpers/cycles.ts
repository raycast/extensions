import { Cycle as LinearCycle } from "@linear/sdk";
import { Image } from "@raycast/api";
import { format, isAfter, isBefore } from "date-fns";

const aWeek = 7 * 24 * 60 * 60 * 1000;

type Cycle = Pick<LinearCycle, "id" | "number" | "startsAt" | "endsAt" | "completedAt">;

export type FormattedCycle = (LinearCycle | Cycle) & {
  isActive: boolean;
  isNext: boolean;
  icon: Image.Source;
  title: string;
};

export function formatCycle(cycle: LinearCycle | Cycle): FormattedCycle {
  const now = Date.now();
  const nextWeek = Date.now() + aWeek;
  const startDate = new Date(cycle.startsAt);
  const endDate = new Date(cycle.endsAt);
  const isActive = !cycle.completedAt && isBefore(startDate, now) && isAfter(endDate, now);
  const isNext = !cycle.completedAt && isBefore(startDate, nextWeek) && isAfter(endDate, nextWeek);
  const icon = isActive
    ? { light: "light/active-cycle.svg", dark: "dark/active-cycle.svg" }
    : { light: "light/cycle.svg", dark: "dark/cycle.svg" };

  const commonTitle = `Cycle ${cycle.number} (${format(startDate, "dd MMM")} - ${format(endDate, "dd MMM")})`;
  const title = isActive ? `Active ${commonTitle}` : commonTitle;

  return { ...cycle, isActive, isNext, icon, title };
}

export function getCycleOptions(cycles: LinearCycle[]) {
  return cycles.filter((cycle) => isAfter(new Date(cycle.endsAt), Date.now())).map(formatCycle);
}
