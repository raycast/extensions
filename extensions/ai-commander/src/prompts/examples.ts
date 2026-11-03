/**
 * Bundled example prompts, one per area, that together show the main features. Each is added once per installation
 * (`seededExamples`), so a deleted example stays deleted and a new one still arrives. IDs are fixed: quicklinks
 * contain them.
 */

import type { PromptDef } from "../core/types";

/** Keeps the order of the content, so the result view can highlight the changes word by word. */
const SIMPLIFY_TEMPLATE = `Rewrite the text in plain language: short sentences, everyday words, no jargon.
Keep all facts and the order of the content, and write in the same language as the text.

{selection}`;

/** Made for a quicklink hotkey: it replaces the selection without opening a window. */
const TRANSLATE_TEMPLATE = `Translate the text into natural English. Keep the meaning, tone, and formatting.
Leave names, code, and URLs unchanged. If the text is already English, return it as it is.

{selection}`;

const SUMMARIZE_TEMPLATE = `Summarize the text in up to five short bullet points, the most important first.
Keep key facts, names, and numbers, and write in the same language as the text.

{selection}`;

/**
 * Works on a copied email and pastes the reply at the cursor. Both arguments are raw: they are the user's own
 * instructions, not material to work on, and a fenced value would break the sentence.
 */
const REPLY_TEMPLATE = `Reply to the email below in the email's language.
Tone: {argument name="tone" options="friendly, formal, direct" | raw}. No subject line, no signature.
Points to make, if any:
{argument name="points" default="" | raw}

{clipboard | trim}`;

/** Adds a checklist below the selected notes. Knowing today's date lets the model resolve "next Friday". */
const ACTION_ITEMS_TEMPLATE = `List the action items from these notes as a checklist below a short heading.
Write each as "- [ ] Task (owner, due date)" and leave out the owner or date if the notes don't name them.
Today is {day}, {date}. Turn relative dates such as "next Friday" into exact dates.
If there are no action items, say so in one line. Write in the same language as the notes.

{selection}`;

export function createExamplePrompts(now: number): PromptDef[] {
  const shared = {
    reasoning: "default",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  } as const;
  return [
    {
      ...shared,
      id: "example-simplify",
      name: "Simplify",
      icon: "Wand",
      template: SIMPLIFY_TEMPLATE,
      creativity: "low",
      tags: ["writing"],
      output: "preview",
      highlightChanges: true,
    },
    {
      ...shared,
      id: "example-translate-en",
      name: "Translate to English",
      icon: "Globe",
      template: TRANSLATE_TEMPLATE,
      creativity: "low",
      tags: ["translation"],
      output: "replace",
      highlightChanges: false,
    },
    {
      ...shared,
      id: "example-summarize",
      name: "Summarize",
      icon: "BulletPoints",
      template: SUMMARIZE_TEMPLATE,
      creativity: "low",
      tags: ["reading"],
      output: "preview",
      highlightChanges: false,
    },
    {
      ...shared,
      id: "example-reply-email",
      name: "Reply to Email",
      icon: "Envelope",
      template: REPLY_TEMPLATE,
      creativity: "medium",
      tags: ["email"],
      output: "preview",
      highlightChanges: false,
    },
    {
      ...shared,
      id: "example-action-items",
      name: "Extract Action Items",
      icon: "CheckCircle",
      template: ACTION_ITEMS_TEMPLATE,
      creativity: "none",
      tags: ["meetings"],
      output: "insertAfter",
      highlightChanges: false,
    },
  ];
}
