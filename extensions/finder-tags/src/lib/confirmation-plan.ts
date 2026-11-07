import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeTags } from "./models";

export type WriteInput = { tags: string[]; paths?: string[] };
export const planSchema = z.object({
  createdAt: z.number(),
  tags: z.array(z.string()),
  paths: z.array(z.object({ path: z.string(), device: z.number(), inode: z.number() })),
  failures: z.array(z.object({ path: z.string(), message: z.string() })),
});
export type WritePlan = z.infer<typeof planSchema>;
export const confirmationLifetime = 2 * 60 * 1000;

export function planKey(kind: "add" | "remove", input: WriteInput): string {
  return createHash("sha256")
    .update(JSON.stringify({ kind, tags: normalizeTags(input.tags), paths: input.paths ?? [] }))
    .digest("hex");
}

export function readPlan(json: string | undefined, now = Date.now()): WritePlan {
  if (!json) throw new Error("Preview and confirm this change before running it.");
  const plan = planSchema.parse(JSON.parse(json));
  if (now - plan.createdAt > confirmationLifetime || now < plan.createdAt)
    throw new Error("The confirmation expired. Preview and confirm the change again.");
  return plan;
}
