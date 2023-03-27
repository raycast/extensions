import { z } from "zod";

export const Quest = z.object({
  id: z.string(),
  title: z.string(),
  tasks: z.array(
    z.object({
      name: z.string(),
      isCompleted: z.boolean(),
    })
  ),
  isStarted: z.boolean(),
  progress: z.number(),
});

export const ShareableQuest = z.intersection(
  Quest.pick({ title: true }),
  z.object({ tasks: z.array(z.object({ name: z.string() })) })
);

export type Quest = z.infer<typeof Quest>;
export type ShareableQuest = z.infer<typeof ShareableQuest>;

export enum TasksFilter {
  All = "all",
  Open = "open",
  Completed = "completed",
}
