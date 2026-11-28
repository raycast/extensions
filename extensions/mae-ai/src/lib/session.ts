import { Message } from "./stream";
import { renderPrompt, Tool } from "./tools";

export interface Turn {
  id: number;
  query: string;
  answer: string;
  model: string;
  status: "streaming" | "complete" | "stopped" | "error";
  error?: string;
}

export function needsLanguage(tool: Tool): boolean {
  return (
    (tool.kind || tool.id) === "translator" ||
    tool.prompt.includes("{{language}}")
  );
}

export function conversationMessages(
  tool: Tool,
  turns: Turn[],
  query: string,
  language: string,
): Message[] {
  if (needsLanguage(tool) && !language.trim()) {
    throw new Error("Choose a target language in Translator Settings first.");
  }
  let prompt = renderPrompt(tool.prompt, language);
  if (
    (tool.kind || tool.id) === "translator" &&
    !tool.prompt.includes("{{language}}")
  ) {
    prompt += `\n\nTranslate into ${language}.`;
  }
  const messages: Message[] = [{ role: "system", content: prompt }];
  for (const turn of turns) {
    if (!turn.answer) continue;
    messages.push(
      { role: "user", content: turn.query },
      { role: "assistant", content: turn.answer },
    );
  }
  messages.push({ role: "user", content: query.trim() });
  return messages;
}
