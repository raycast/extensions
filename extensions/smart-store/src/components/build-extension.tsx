import { Action, ActionPanel, Detail, Icon, openExtensionPreferences, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { askText, getAIStatus } from "../lib/ai";
import { StoreExtension } from "../lib/catalog";
import { languageName } from "../lib/language";

function planPrompt(query: string, lang: string, closest: StoreExtension[]) {
  const nearby = closest.length
    ? `The closest existing extensions, which don't fully cover the need:\n${closest
        .slice(0, 5)
        .map((item) => `- ${item.title}: ${item.description}`)
        .join("\n")}`
    : "No existing extension in the Raycast Store covers this need.";

  return `A Raycast user searched the Raycast Store for: "${query}".
${nearby}

Help them build the missing extension themselves with an AI coding assistant. Write in ${languageName(lang)}, in Markdown, with these sections:

## Idea
An English extension name (the Raycast Store requires English names) and a one-sentence pitch.

## What it would do
The commands it would offer (verb + noun titles, in English), each with one line explaining it.

## How it could work
The macOS mechanisms, CLIs, files or web APIs it would rely on, and any permission or limitation to know about.

## Difficulty
Easy, medium or hard for a beginner, and why, in two or three sentences.

## Prompt for your AI coding assistant
A single fenced code block opened with exactly four backticks and the word prompt (\`\`\`\`prompt) and closed with four backticks (keep this marker unchanged whatever language you write in, and use it nowhere else) containing a complete prompt, in English, that someone can paste into Claude, ChatGPT or Cursor to build this as a Raycast extension with TypeScript, React and the @raycast/api package, ready to publish on the Raycast Store. Ask the assistant to explain each step for a beginner.`;
}

function offlinePlan(query: string) {
  const prompt = `Build a Raycast extension (TypeScript, React, @raycast/api) that does the following: ${query}.

Explain each step for a beginner: scaffolding with the "Create Extension" command, the commands to create, the macOS APIs or tools to use, how to test it with "npm run dev", and how to publish it on the Raycast Store with "npm run publish".`;
  return `## Build it yourself

No AI provider is configured, so here is a generic starting prompt. Configure Raycast AI or an API key in the extension preferences to get a tailored plan.

## Prompt for your AI coding assistant

\`\`\`\`prompt
${prompt}
\`\`\`\``;
}

/**
 * The prompt is the four-backtick block tagged `prompt`, a marker the AI is told never to translate or reuse.
 * Four backticks let the prompt itself contain ordinary ``` code fences.
 */
function extractPrompt(markdown: string): string | undefined {
  return markdown.match(/````prompt[^\S\n]*\n([\s\S]*?)\n````/)?.[1]?.trim() || undefined;
}

export function BuildExtension(props: { query: string; lang: string; closest?: StoreExtension[] }) {
  const { query, lang, closest = [] } = props;
  const ai = getAIStatus();
  const [markdown, setMarkdown] = useState(ai.available ? "" : offlinePlan(query));
  const [isLoading, setIsLoading] = useState(ai.available);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!ai.available) return;
    const controller = new AbortController();
    setIsLoading(true);
    setMarkdown("");
    askText(planPrompt(query, lang, closest), setMarkdown, controller.signal)
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMarkdown(offlinePlan(query));
        showToast({ style: Toast.Style.Failure, title: "AI unavailable", message: String(error?.message ?? error) });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [query, lang, run]);

  const regenerate = useCallback(() => setRun((value) => value + 1), []);
  const prompt = extractPrompt(markdown);
  const issueTitle = `Extension Request: ${query}`.slice(0, 120);

  return (
    <Detail
      navigationTitle="Build It with AI"
      isLoading={isLoading}
      markdown={markdown || `# Preparing a plan for “${query}”…`}
      actions={
        <ActionPanel>
          {prompt && (
            <ActionPanel.Section title="Use the Prompt">
              <Action.CopyToClipboard title="Copy Prompt" content={prompt} />
              <Action.OpenInBrowser
                title="Open in Claude"
                icon={Icon.Message}
                url={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`}
              />
              <Action.OpenInBrowser
                title="Open in ChatGPT"
                icon={Icon.Message}
                url={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Full Plan"
              content={markdown}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {ai.available && (
              <Action
                title="Regenerate Plan"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={regenerate}
              />
            )}
            <Action.OpenInBrowser
              title="Request Extension on GitHub"
              icon={Icon.Plus}
              url={`https://github.com/raycast/extensions/issues/new?template=extension_request.yml&title=${encodeURIComponent(issueTitle)}`}
            />
            <Action.OpenInBrowser
              title="Open Raycast Developer Docs"
              icon={Icon.Book}
              url="https://developers.raycast.com"
            />
            {!ai.available && (
              <Action title="Configure AI Provider" icon={Icon.Gear} onAction={openExtensionPreferences} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
