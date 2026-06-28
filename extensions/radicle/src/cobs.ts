import * as z from "zod/v4-mini";
import { useSQL } from "@raycast/utils";

interface UseCobsOptions {
  path: string;
  rid: string;
}

export function useCobs(options: UseCobsOptions) {
  const data: { openPatches: number; openIssues: number } = { openPatches: 0, openIssues: 0 };

  const { data: issueCount, ...rest } = useSQL<{ state: string; count: number }>(
    options.path,
    `SELECT
         issue->'$.state' AS state,
         COUNT(*) AS count
     FROM issues
     WHERE repo = "rad:${options.rid}"
     GROUP BY issue->'$.state.status'`,
    { permissionPriming: "This is required to read your Radicle databases." },
  );

  const { data: patchCount } = useSQL<{ state: string; count: number }>(
    options.path,
    `SELECT
            patch->'$.state' AS state,
            COUNT(*) AS count
        FROM patches
        WHERE repo = "rad:${options.rid}"
        GROUP BY patch->'$.state.status'`,
    { permissionPriming: "This is required to read your Radicle databases." },
  );

  if (issueCount && issueCount.length > 0) {
    const parsed = issueCount
      .map(({ state, count }) => ({ ...issueCountSchema.parse(JSON.parse(state)), count }))
      .find(({ status }) => status === "open");
    if (parsed) {
      data.openIssues = parsed.count;
    }
  }

  if (patchCount && patchCount.length > 0) {
    const parsed = patchCount
      .map(({ state, count }) => ({ ...patchCountSchema.parse(JSON.parse(state)), count }))
      .find(({ status }) => status === "open");
    if (parsed) {
      data.openPatches = parsed.count;
    }
  }

  return { data, ...rest };
}

const issueCountSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("open") }),
  z.object({
    status: z.literal("closed"),
    reason: z.optional(z.string()),
  }),
]);

const patchCountSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("draft") }),
  z.object({ status: z.literal("archived") }),
  z.object({ status: z.literal("merged"), revision: z.string(), commit: z.string() }),
  z.object({
    status: z.literal("open"),
    conflicts: z.optional(z.array(z.tuple([z.string(), z.string()]))),
  }),
]);
