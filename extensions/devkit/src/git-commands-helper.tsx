import { ActionPanel, showToast, Toast, Clipboard, Action, List } from "@raycast/api";
import { useState } from "react";

const gitCommands = [
  { value: "git status", title: "git status", description: "Show the working tree status" },
  { value: "git add .", title: "git add .", description: "Stage all changes in the current directory" },
  {
    value: "git commit -m 'message'",
    title: "git commit -m 'message'",
    description: "Commit staged changes with a message",
  },
  {
    value: "git push origin main",
    title: "git push origin main",
    description: "Push commits to the main branch on origin",
  },
  {
    value: "git pull origin main",
    title: "git pull origin main",
    description: "Fetch and merge changes from the main branch on origin",
  },
  { value: "git log --oneline", title: "git log --oneline", description: "Show a compact log of commits" },
  { value: "git diff", title: "git diff", description: "Show changes between commits, commit and working tree, etc." },
  { value: "git branch", title: "git branch", description: "List, create, or delete branches" },
  {
    value: "git checkout -b branch",
    title: "git checkout -b branch",
    description: "Create and switch to a new branch",
  },
  { value: "git merge branch", title: "git merge branch", description: "Merge a branch into the current branch" },
];

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCopy(command: string) {
    setIsLoading(true);
    await Clipboard.copy(command);
    await showToast(Toast.Style.Success, "Git command copied to clipboard");
    setIsLoading(false);
  }

  return (
    <List isLoading={isLoading} isShowingDetail={true} searchBarPlaceholder="Search git commands...">
      {gitCommands.map((cmd) => (
        <List.Item
          key={cmd.value}
          title={cmd.title}
          subtitle={cmd.value}
          detail={
            <List.Item.Detail
              markdown={cmd.description}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Command" text={cmd.value} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Copy Git Command" onAction={() => handleCopy(cmd.value)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
