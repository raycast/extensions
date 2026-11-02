import { closeMainWindow, PopToRootType } from "@raycast/api";
import { prepareNewProject } from "../lib/create-project";
import { TARGET_APP } from "../lib/paths";
type Input = {
  /** The user's exact message, copied verbatim. Preserve spelling, punctuation, and line breaks. Remove only @glaze; never rewrite or expand the request. */
  prompt: string;
};
/** For an explicitly new app, open a new project composer with the user's idea. The user must press Send in Glaze. */
export default async function tool(input: Input) {
  await prepareNewProject(input.prompt);
  // The handoff already succeeded. A window error must not invite an AI retry.
  await closeMainWindow({ popToRootType: PopToRootType.Suspended }).catch(
    (error: unknown) =>
      console.error("Could not close Raycast after handoff", error),
  );
  return {
    status: "draft_opened",
    app: TARGET_APP.name,
    message:
      "The idea was opened in Glaze's composer. The user must press Send in Glaze to start building. No project creation has been started by this tool.",
  };
}
