export function getSummaryBlockSnippet(
  index: number,
  splitTranscripts: number,
  summaryBlock: string,
  MAX_CHARS: number,
) {
  return `Summarize this transcription of a youtube video.
    The transcription is split into parts and this is part ${index} of ${splitTranscripts}.
    Be as concise as possible.
    Do not use more then ${MAX_CHARS / splitTranscripts} characters.
    
    Here is the transcript: ${summaryBlock}`;
}

export function getAiInstructionSnippet(language: string, temporarySummary: string, transcript: string | undefined) {
  return `Extract the key highlights from this YouTube video transcript. Ignore sponsor segments. Answer in ${language}.

Format each highlight as:
[Emoji] **[Headline]**
[One sentence description]

Example:
🚀 **New API Released**
The company announced a faster API with 50% reduced latency.

Transcript:
${temporarySummary.length > 0 ? temporarySummary : transcript}`;
}

type Question = {
  question: string;
  answer: string;
};

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = "You answer questions about a YouTube video based on its transcript. Be concise and direct.";

/**
 * Builds a messages array for OpenAI/Anthropic/Ollama with full conversation history.
 */
export function buildFollowUpMessages(
  currentQuestion: string,
  transcript: string,
  summary: string,
  previousQA: Question[] = [],
): Message[] {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Video transcript:\n${transcript}` },
    { role: "assistant", content: summary },
  ];

  for (const qa of previousQA) {
    messages.push({ role: "user", content: qa.question });
    messages.push({ role: "assistant", content: qa.answer });
  }

  messages.push({ role: "user", content: currentQuestion });

  return messages;
}

/**
 * Builds a string prompt for Raycast AI (which doesn't support messages array).
 */
export function getFollowUpQuestionSnippet(
  question: string,
  transcript: string,
  summary: string = "",
  previousQA: Question[] = [],
): string {
  const previousContext =
    previousQA.length > 0
      ? `\nPrevious Q&A:\n${previousQA.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}\n`
      : "";

  return `${SYSTEM_PROMPT}

Video transcript:
${transcript}

Your summary:
${summary}
${previousContext}
Question: ${question}`;
}
