import { z } from "zod";

export const Checklist = z.object({
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

export const ShareableChecklist = z.intersection(
  Checklist.pick({ title: true }),
  z.object({ tasks: z.array(z.object({ name: z.string() })) })
);

export type Checklist = z.infer<typeof Checklist>;
export type ShareableChecklist = z.infer<typeof ShareableChecklist>;

export enum TasksFilter {
  All = "all",
  Open = "open",
  Completed = "completed",
}
