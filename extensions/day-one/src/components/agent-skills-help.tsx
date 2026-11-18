import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { SKILLS_REPO_URL } from "../lib/setup";

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
- **Each project may get a model cache.** The first search downloads a 90 MB search model into a \`.fastembed_cache\` folder wherever the agent runs. To keep it in one place, add this to your shell profile:

\`\`\`sh
export FASTEMBED_CACHE_DIR="$HOME/.cache/fastembed"
\`\`\`

- **Installed for every project.** Run Doctor installs the skills globally, so every project your agent opens can use them. Run \`npx skills remove --global dayone-cli\` to remove them.
`;

export function AgentSkillsHelp() {
  return (
    <Detail
      navigationTitle="Day One Agent Skills"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Skills Repository" url={SKILLS_REPO_URL} />
          <Action.CopyToClipboard
            title="Copy Cache Setting"
            content={'export FASTEMBED_CACHE_DIR="$HOME/.cache/fastembed"'}
            icon={Icon.Terminal}
          />
        </ActionPanel>
      }
    />
  );
}
