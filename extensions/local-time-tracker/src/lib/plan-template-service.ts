import { nextPlanUpdatedAt, parsePlanContent } from "./planning";
import { withReminderOperation } from "./reminder-service";
import { getPlanTemplates, getProjects, savePlanTemplates } from "./storage";
import type { PlanTemplate } from "./types";

type TemplateDraft = Pick<PlanTemplate, "name" | "projectId" | "content"> & {
  id?: string;
  expectedUpdatedAt?: string;
};

export async function savePlanTemplate(draft: TemplateDraft): Promise<PlanTemplate> {
  return withReminderOperation(async () => {
    const templates = await getPlanTemplates();
    const previous = draft.id ? templates.find((item) => item.id === draft.id) : undefined;
    if (draft.id && (!previous || previous.updatedAt !== draft.expectedUpdatedAt))
      throw new Error("The template has changed. Reopen the editor.");
    const name = draft.name.trim();
    if (!name) throw new Error("Enter a template name");
    if (!(await getProjects()).some((project) => project.id === draft.projectId))
      throw new Error("Select an existing project");
    const parsed = parsePlanContent(draft.content);
    const now = new Date();
    const saved: PlanTemplate = {
      id: previous?.id ?? crypto.randomUUID(),
      name,
      projectId: draft.projectId,
      content: [parsed.title, ...parsed.tasks.map((task) => task.title)].join("\n"),
      createdAt: previous?.createdAt ?? now.toISOString(),
      updatedAt: nextPlanUpdatedAt(previous?.updatedAt, now),
    };
    await savePlanTemplates(
      previous ? templates.map((item) => (item.id === saved.id ? saved : item)) : [...templates, saved],
    );
    return saved;
  });
}

export async function deletePlanTemplate(id: string, expectedUpdatedAt: string): Promise<void> {
  await withReminderOperation(async () => {
    const templates = await getPlanTemplates();
    const previous = templates.find((item) => item.id === id);
    if (!previous || previous.updatedAt !== expectedUpdatedAt)
      throw new Error("The template has changed. Reload Templates.");
    await savePlanTemplates(templates.filter((item) => item.id !== id));
  });
}
