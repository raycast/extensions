import { Action, ActionPanel, Clipboard, closeMainWindow, List, showHUD } from "@raycast/api";
import { useState } from "react";
import { prompts } from "./data/prompts.schema";
import { type Prompt } from "./types";

function pickRandomId(exclude?: string): string | undefined {
  if (prompts.length === 0) return undefined;
  const candidates = prompts.length >= 2 && exclude ? prompts.filter((p) => p.id !== exclude) : prompts;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

async function copyText(text: string) {
  await Clipboard.copy(text);
  await showHUD(`Copied: ${text}`);
  await closeMainWindow();
}

function renderPromptMarkdown(p: Prompt): string {
  const lines = [`# ${p.text}`, "", p.context, "", "## Try opening with", ""];
  for (const ex of p.examples) lines.push(`- ${ex}`);
  return lines.join("\n");
}

export default function Command() {
  const [selectedId, setSelectedId] = useState<string | undefined>(() => pickRandomId());

  const pickRandom = () => {
    const next = pickRandomId(selectedId);
    setSelectedId(next);
  };

  return (
    <List isShowingDetail selectedItemId={selectedId} onSelectionChange={(id) => setSelectedId(id ?? undefined)}>
      {prompts.map((p) => (
        <List.Item
          key={p.id}
          id={p.id}
          title={p.text}
          detail={<List.Item.Detail markdown={renderPromptMarkdown(p)} />}
          actions={
            <ActionPanel>
              <Action title="Copy Prompt" onAction={() => copyText(p.text)} />
              <Action title="Shuffle" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={pickRandom} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
