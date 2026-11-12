import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NewThreadForm } from "./components/new-thread-form";
import PromptForm from "./components/prompt-form";
import { deletePrompt, getPrompts, initializeDefaults, type Prompt } from "./lib/prompts";
import { startThreadAndOpen } from "./lib/ui";

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** The `amp -x` command for a prompt, with the Default Flags preference. */
function ampCommand(prompt: Prompt) {
  const { defaultFlags } = getPreferenceValues<Preferences>();
  return ["amp", defaultFlags?.trim(), "-x", shellQuote(prompt.prompt)].filter(Boolean).join(" ");
}

async function loadPrompts() {
  await initializeDefaults();
  return (await getPrompts()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export default function ExecutePrompts() {
  const {
    data: prompts = [],
    isLoading,
    revalidate,
  } = usePromise(loadPrompts, [], {
    failureToastOptions: { title: "Failed to load prompts" },
  });

  const byCategory = new Map<string, Prompt[]>();
  for (const p of prompts) {
    const category = p.category || "Uncategorized";
    byCategory.set(category, [...(byCategory.get(category) ?? []), p]);
  }

  async function paste(prompt: Prompt) {
    try {
      await Clipboard.paste(ampCommand(prompt));
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to paste command" });
    }
  }

  async function downloadAsMarkdown(prompt: Prompt) {
    try {
      const filename = prompt.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const markdown = `# ${prompt.title}

**Category:** ${prompt.category || "Uncategorized"}
${prompt.description ? `\n**Description:** ${prompt.description}\n` : ""}
**Prompt:**
\`\`\`
${prompt.prompt}
\`\`\`

**Command:**
\`\`\`bash
${ampCommand(prompt)}
\`\`\`
`;
      const filePath = path.join(os.homedir(), "Downloads", `${filename}.md`);
      fs.writeFileSync(filePath, markdown);
      await open(filePath);
      await showToast(Toast.Style.Success, "Markdown file downloaded");
    } catch (error) {
      await showFailureToast(error, { title: "Failed to download markdown" });
    }
  }

  async function remove(prompt: Prompt) {
    const confirmed = await confirmAlert({
      title: "Delete Prompt",
      message: `Are you sure you want to delete "${prompt.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deletePrompt(prompt.id);
      revalidate();
      await showToast(Toast.Style.Success, "Prompt deleted");
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete prompt" });
    }
  }

  const addAction = (
    <Action.Push
      title="Add New Prompt"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PromptForm onSave={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search prompts…">
      {[...byCategory].map(([category, items]) => (
        <List.Section key={category} title={category}>
          {items.map((prompt) => (
            <List.Item
              key={prompt.id}
              title={prompt.title}
              subtitle={prompt.description}
              icon={Icon.Document}
              keywords={[category, prompt.prompt]}
              accessories={[{ date: prompt.updatedAt, tooltip: `Last updated: ${prompt.updatedAt.toLocaleString()}` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Start as Thread"
                      icon={Icon.Rocket}
                      onAction={() => startThreadAndOpen(prompt.prompt)}
                    />
                    <Action.Push
                      title="Start in Project…"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      target={<NewThreadForm prompt={prompt.prompt} navigationTitle={prompt.title} />}
                    />
                    <Action
                      title="Paste Command"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => paste(prompt)}
                    />
                    <Action.CopyToClipboard title="Copy Command" content={ampCommand(prompt)} />
                    <Action
                      title="Download as Markdown"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() => downloadAsMarkdown(prompt)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    {addAction}
                    <Action.Push
                      title="Edit Prompt"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<PromptForm prompt={prompt} onSave={revalidate} />}
                    />
                    <Action
                      title="Delete Prompt"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(prompt)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="No prompts found"
        description="Add a new prompt or adjust your search"
        icon={Icon.Document}
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
    </List>
  );
}
