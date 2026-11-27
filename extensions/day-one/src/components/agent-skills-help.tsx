import { useRef } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { failToast } from "../lib/feedback";
import { removeAgentSkills, SKILLS_REPO_URL } from "../lib/setup";

const markdown = `# Using Day One's Agent Skills

The skills teach AI coding agents such as **Claude Code**, **Codex**, and **Cursor** how to use the Day One CLI. Once they're installed, you don't call them by name: ask about your journal in plain words, and the agent picks the skill up and runs \`dayone\` commands for you.

## Try asking

- "Search my journal for the last time I went camping."
- "What did I write about work in March?"
- "Add a journal entry: shipped the Day One extension today."
- "Append to today's daily chat that I'm feeling good about the launch."
- "List yesterday's entries."

## Good to know

- **The agent syncs first.** The skill tells it to run \`dayone sync\` before reading, so answers include your newest entries.
- **Writes need your OK.** Most agents ask before running a command that changes your journal. Read the command before you approve it.
- **One search model for everything.** The CLI keeps its 90 MB search model in one folder for your user account, so the agent and Raycast share it, whichever project the agent runs in.
- **Installed for every project.** Run Doctor installs the skills globally, so every project your agent opens can use them. Run \`npx skills remove --global dayone-cli\` to remove them.
`;

export function AgentSkillsHelp() {
  const { pop } = useNavigation();
  // One removal at a time: a second ⌃X while the first runs must not start another or pop twice.
  const removing = useRef(false);

  async function remove() {
    if (removing.current) return;
    removing.current = true;
    try {
      await confirmAndRemove();
    } finally {
      removing.current = false;
    }
  }

  async function confirmAndRemove() {
    const confirmed = await confirmAlert({
      title: "Remove Day One Agent Skills?",
      message: "Your agents stop using the Day One skill in every project. Run Doctor can install it again.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing Agent Skills…" });
    try {
      await removeAgentSkills();
      toast.style = Toast.Style.Success;
      toast.title = "Agent Skills Removed";
      // Back to Doctor, whose AI Agents row picks up the change within a second.
      pop();
    } catch (error) {
      await failToast(error, "Removing Agent Skills Failed", toast);
    }
  }

  return (
    <Detail
      navigationTitle="Day One Agent Skills"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Skills Repository" url={SKILLS_REPO_URL} />
          <Action
            title="Remove Agent Skills"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
        </ActionPanel>
      }
    />
  );
}
