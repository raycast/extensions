import { closeMainWindow, PopToRootType } from "@raycast/api";
import { getLocalProjects } from "../lib/apps";
import { editWithAgent } from "../lib/deeplinks";
import { editProjectPrompt } from "../lib/edit-project-prompt";

type Input = {
  /** The exact ID of the existing project returned by list-projects. Never invent an ID. */
  projectId: string;
  /** Copy the user's full request verbatim, removing only the @glaze mention. Keep the target-app phrase here too; the tool removes projectReference. Never summarize or rewrite. Example: "let's add light mode to my nts app". */
  originalRequest: string;
  /** Extract the exact, unique substring identifying the destination project, e.g. "to my nts app". The tool deletes it before sending. Include adjacent routing punctuation where needed, e.g. "In my Timer app, " or "Timer: ". Required: use "" only when the project is implied by conversation or app mentions are part of the requested change itself. Never remove quoted UI text, rename targets, comparisons, or other requirements. */
  projectReference: string;
};

/** Route the original request to a project and remove the separately extracted projectReference before opening its agent. */
export default async function tool({
  projectId,
  originalRequest,
  projectReference,
}: Input) {
  const project = (await getLocalProjects()).find(
    (item) => item.id === projectId,
  );
  if (!project?.runtimePath) {
    throw new Error(
      "Project not found. List projects and use an exact ID; do not create a new app instead.",
    );
  }
  const prompt = editProjectPrompt(originalRequest, projectReference);
  await editWithAgent(project.runtimePath, project.id, prompt);
  // The handoff already succeeded. A window error must not invite an AI retry.
  await closeMainWindow({ popToRootType: PopToRootType.Suspended }).catch(
    (error: unknown) =>
      console.error("Could not close Raycast after handoff", error),
  );
  return {
    status: "edit_draft_opened",
    projectId: project.id,
    name: project.displayName ?? project.name,
    prompt,
    message:
      "The request is in this project's agent. Press Send in Glaze to apply the changes. Work has not started yet.",
  };
}
