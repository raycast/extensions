import { DustAPI } from "@dust-tt/client";
import {
  Application,
  Clipboard,
  getFrontmostApplication,
  getSelectedText,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { answerQuestion, ConversationContext } from "./answerQuestion";
import { getDustClient, provider } from "./dust_api/oauth";
import { AgentType, getUser, getWorkspaceId, setUser, stripMarkdown } from "./utils";

function sameApplication(a: Application | undefined, b: Application | undefined): boolean {
  return a !== undefined && b !== undefined && a.bundleId === b.bundleId;
}

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
    // Real API error, not "agent not found" — must not be mistaken for a deleted agent.
    throw new Error(r.error.message);
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
    // Capture the selection and frontmost app before any network call, to avoid a race with focus changes.
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
    const sourceApp = await getFrontmostApplication().catch(() => undefined);

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
    const answer = await answerQuestion({
      question,
      dustApi,
      context,
      agent,
      signal: abortController.signal,
      setDustAnswer: () => {},
      setConversationId: () => {},
      setConversationTitle: () => {},
      setDustDocuments: () => {},
    });
    if (!answer) {
      return;
    }

    const plainAnswer = stripMarkdown(answer);
    if (!plainAnswer.trim()) {
      // Clipboard.paste("") would clear the selection instead of pasting anything.
      await Clipboard.copy(answer);
      showToast({
        style: Toast.Style.Failure,
        title: "Answer had no plain text to paste — copied the raw answer instead",
        message: "Paste it manually with ⌘V",
      });
      return;
    }
    const [currentSelection, currentApp] = await Promise.all([
      getSelectedText().catch(() => undefined),
      getFrontmostApplication().catch(() => undefined),
    ]);

    if (currentSelection === question && sameApplication(sourceApp, currentApp)) {
      await Clipboard.paste(plainAnswer);
      showToast({ style: Toast.Style.Success, title: "Replaced selected text with the answer" });
    } else {
      await Clipboard.copy(plainAnswer);
      showToast({
        style: Toast.Style.Success,
        title: "Selection changed — answer copied instead",
        message: "Paste it manually with ⌘V",
      });
    }
  } catch (error) {
    showFailureToast(error, { title: "Could not replace selection" });
  }
});
