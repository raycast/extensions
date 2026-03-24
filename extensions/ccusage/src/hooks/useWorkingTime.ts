import { subDays, format } from "date-fns";
import { useCCUsageBlocksCli } from "./useCCUsageBlocksCli";
import { Block } from "../types/usage-types";

type WorkingTimeResult = {
  todayMs: number;
  yesterdayMs: number;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
};

const localDateStr = (isoString: string): string => {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const blockDurationMs = (block: Block, now: Date): number => {
  const start = new Date(block.startTime);
  const end = block.isActive ? now : block.actualEndTime ? new Date(block.actualEndTime) : new Date(block.endTime);
  return Math.max(0, end.getTime() - start.getTime());
};

const workingMsForDate = (blocks: Block[], dateStr: string, now: Date): number =>
  blocks
    .filter((b) => !b.isGap && localDateStr(b.startTime) === dateStr)
    .reduce((sum, b) => sum + blockDurationMs(b, now), 0);

export const useWorkingTime = (): WorkingTimeResult => {
  const { data, isLoading, error, revalidate } = useCCUsageBlocksCli();

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(now, 1), "yyyy-MM-dd");

  const blocks = data?.blocks ?? [];
  const todayMs = workingMsForDate(blocks, todayStr, now);
  const yesterdayMs = workingMsForDate(blocks, yesterdayStr, now);

  return { todayMs, yesterdayMs, isLoading, error, revalidate };
};
