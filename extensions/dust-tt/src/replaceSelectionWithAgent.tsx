import { DustAPI } from "@dust-tt/client";
import { Clipboard, getSelectedText, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { answerQuestion, ConversationContext } from "./answerQuestion";
import { getDustClient, provider } from "./dust_api/oauth";
import { AgentType, getUser, getWorkspaceId, setUser, stripMarkdown } from "./utils";

async function ensureUser(dustApi: DustAPI) {
  const cachedUser = await getUser();
  if (cachedUser) {
    return cachedUser;
  }
  const r = await dustApi.me();
  if (r.isOk()) {
    await setUser(r.value);
    return r.value;
  }
  return undefined;
}

async function resolveAgent(dustApi: DustAPI, agentId: string): Promise<AgentType | undefined> {
  const r = await dustApi.getAgentConfigurations({ view: "list" });
  if (r.isErr()) {
    return undefined;
  }
  const found = r.value.find((a) => a.sId === agentId);
  if (!found) {
    return undefined;
  }
  return { sId: found.sId, name: found.name, description: found.description };
}

export default withAccessToken(provider)(async function ReplaceSelectionWithAgentCommand(
  props: LaunchProps<{ launchContext?: { agentId?: string } }>,
) {
  try {
    const dustApi = getDustClient();

    const workspaceId = await getWorkspaceId();
    if (!workspaceId) {
      await showHUD("Select a Dust workspace first (run “Select Workspace”)");
      return;
    }
    dustApi.setWorkspaceId(workspaceId);

    const agentId = props.launchContext?.agentId;
    if (!agentId) {
      await showHUD("This shortcut isn't linked to an agent yet — create one from “Set up Replace Selection”");
      return;
    }

    const agent = await resolveAgent(dustApi, agentId);
    if (!agent) {
      await showHUD("This Quicklink's agent could not be found — it may have been deleted or renamed");
      return;
    }

    let question: string;
    try {
      question = await getSelectedText();
    } catch {
      await showHUD("No text selected");
      return;
    }
    if (!question.trim()) {
      await showHUD("No text selected");
      return;
    }

    const user = await ensureUser(dustApi);
    if (!user) {
      await showHUD("Could not load your Dust user");
      return;
    }

    const context: ConversationContext = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      username: user.firstName,
      email: user.email,
      fullName: user.fullName,
      profilePictureUrl: user.image,
      origin: "raycast",
    };

    const abortController = new AbortController();
    await answerQuestion({
      question,
      dustApi,
      context,
      agent,
      signal: abortController.signal,
      setDustAnswer: () => {},
      setConversationId: () => {},
      setConversationTitle: () => {},
      setDustDocuments: () => {},
      onAnswer: async (answer: string) => {
        await Clipboard.paste(stripMarkdown(answer));
        showToast({ style: Toast.Style.Success, title: "Replaced selected text with the answer" });
      },
    });
  } catch (error) {
    showFailureToast(error, { title: "Could not replace selection" });
  }
});
