import { LaunchType, launchCommand, openExtensionPreferences, type Tool } from "@raycast/api";
import { inRequiredAiWorkspace, confirmInRequiredAiWorkspace } from "../lib/workspace-ai";
import { currentWorkspace } from "../lib/workspaces";

type Input = {
  view:
    | "add-workspace"
    | "preferences"
    | "workspaces"
    | "search-tools"
    | "integrations"
    | "connections"
    | "artifacts"
    | "saved-tools"
    | "add-connection"
    | "add-integration"
    | "policies"
    | "approvals";
  /** Exact canonical ID for workspace-specific views. Omit for preferences, workspaces, or add-workspace. */
  workspaceId?: string;
};

const VIEWS = new Set([
  "add-workspace",
  "preferences",
  "workspaces",
  "search-tools",
  "integrations",
  "connections",
  "artifacts",
  "saved-tools",
  "add-connection",
  "add-integration",
  "policies",
  "approvals",
]);
const GLOBAL_VIEWS = new Set(["add-workspace", "preferences", "workspaces"]);

function validate(input: Input) {
  if (!VIEWS.has(input.view)) throw new Error("Unknown Executor view.");
  if (GLOBAL_VIEWS.has(input.view) && input.workspaceId !== undefined)
    throw new Error("Global setup views do not take a workspace ID.");
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  validate(input);
  const details = () => ({
    message: "Open this native Executor view? Complete credential entry privately in Raycast.",
    info: [{ name: "View", value: input.view }],
  });
  return GLOBAL_VIEWS.has(input.view) ? details() : confirmInRequiredAiWorkspace(input, details);
};

/** Open a native command or secure workspace setup. No credentials belong in chat. Opening a form does not complete its action. */
export default async function tool(input: Input) {
  validate(input);
  const openView = async () => {
    if (input.view === "preferences") await openExtensionPreferences();
    else
      await launchCommand({
        name: input.view === "add-workspace" ? "workspaces" : input.view,
        type: LaunchType.UserInitiated,
        context:
          input.view === "add-workspace"
            ? { intent: "add" }
            : GLOBAL_VIEWS.has(input.view)
              ? {}
              : { workspaceId: currentWorkspace()!.id },
      });
    return {
      status: "opened",
      view: input.view,
      nextStep: "Complete any form or sign-in in Raycast. No configuration change has been performed by this tool.",
    };
  };
  return GLOBAL_VIEWS.has(input.view) ? openView() : inRequiredAiWorkspace(input, openView);
}
