import { launchCommand, LaunchType, type Tool } from "@raycast/api";
import { currentWorkspace } from "../lib/workspaces";
import { addConnectionConfirmation } from "../lib/connection-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a read result. */
  workspaceId: string;
  /** Exact integration slug returned by list-integrations. */
  integration: string;
  owner: "org" | "user";
  /** Exact authentication template returned by list-integrations. */
  template: string;
  /** Optional account label. Never include credentials. */
  label?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => addConnectionConfirmation(input));

/** Open native connection setup with the exact workspace and authentication selected. Credentials are entered privately by the user, never in AI arguments. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, async () => {
    await addConnectionConfirmation(input);
    await launchCommand({
      name: "add-connection",
      type: LaunchType.UserInitiated,
      context: {
        workspaceId: currentWorkspace()!.id,
        integration: input.integration,
        owner: input.owner,
        template: input.template,
        label: input.label,
      },
    });
    return {
      status: "user_action_required",
      pending: true,
      instructions:
        "Complete the native Add Connection form in Raycast. Provider authorization may open in a browser. Then call list-connections to check completion. Never request credentials in chat.",
    };
  });
}
