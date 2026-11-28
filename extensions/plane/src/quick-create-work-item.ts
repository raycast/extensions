import { getPreferenceValues, LaunchProps, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { plane, requirePlaneClient } from "./api/auth";
import { getMemberProjects, matchProject } from "./api/projects";
import { createWorkItem } from "./api/work-items";
import { getMe } from "./api/users";
import { parseMarkdownToHtml } from "./helpers/parser";
import { formatWorkItemIdentifier } from "./helpers/identifiers";
import { getWorkItemUrlWithIdentifier } from "./helpers/work-items";
import { showNoViewFailure, showWorkItemSuccess } from "./helpers/no-view";

async function command(props: LaunchProps<{ arguments: Arguments.QuickCreateWorkItem }>) {
  const { title, description } = props.arguments;
  const preferences = getPreferenceValues<Preferences.QuickCreateWorkItem>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating work item" });

  try {
    const client = requirePlaneClient();
    const projects = await getMemberProjects();
    const project = preferences.defaultProject
      ? matchProject(projects, preferences.defaultProject)
      : projects.length === 1
        ? projects[0]
        : undefined;

    if (!project?.id) {
      toast.style = Toast.Style.Failure;
      toast.title = preferences.defaultProject
        ? `Project "${preferences.defaultProject}" not found`
        : "Set a default project";
      toast.message = "Set the project identifier (e.g. ENG) in this command's preferences.";
      toast.primaryAction = { title: "Open Command Preferences", onAction: () => openCommandPreferences() };
      return;
    }

    const me = preferences.assignToMe ? await getMe() : undefined;
    const workItem = await createWorkItem(project.id, {
      name: title.trim(),
      ...(description?.trim() ? { descriptionHtml: await parseMarkdownToHtml(description) } : {}),
      ...(me?.id ? { assignees: [me.id] } : {}),
    });

    const identifier = formatWorkItemIdentifier(project.identifier, workItem?.sequenceId);
    await showWorkItemSuccess(
      toast,
      `Created ${identifier}`,
      identifier,
      getWorkItemUrlWithIdentifier(client.workspaceSlug, identifier),
    );
  } catch (error) {
    await toast.hide();
    await showNoViewFailure("Failed to create work item", error);
  }
}

export default withAccessToken(plane)(command);
