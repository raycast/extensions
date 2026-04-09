import { readFile } from "node:fs/promises";

const ASK_USER_MARKER = "Raycast collected the user's answer for ask_user.";

export async function buildGeminiAskUserRetryOutput(raw = {}) {
  if (raw.stop_hook_active === true) {
    return null;
  }

  const transcriptPath =
    typeof raw.transcript_path === "string" ? raw.transcript_path : null;
  if (!transcriptPath) {
    return null;
  }

  const transcript = await readTranscript(transcriptPath);
  if (!transcript) {
    return null;
  }

  const handoff = extractLatestAskUserHandoff(transcript);
  if (!handoff) {
    return null;
  }

  return {
    decision: "deny",
    reason: [
      "The user's answer has already been collected externally via Raycast.",
      "Use the following ask_user result as if the tool had returned it successfully, and continue without calling ask_user again.",
      "",
      JSON.stringify(handoff, null, 2),
    ].join("\n"),
  };
}

async function readTranscript(transcriptPath) {
  try {
    const raw = await readFile(transcriptPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function extractLatestAskUserHandoff(transcript = {}) {
  const messages = Array.isArray(transcript.messages)
    ? transcript.messages
    : [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const toolCalls = Array.isArray(message?.toolCalls)
      ? message.toolCalls
      : [];

    for (let toolIndex = toolCalls.length - 1; toolIndex >= 0; toolIndex -= 1) {
      const toolCall = toolCalls[toolIndex];
      if (toolCall?.name !== "ask_user") {
        continue;
      }

      const errorText =
        toolCall?.result?.[0]?.functionResponse?.response?.error;
      if (
        typeof errorText !== "string" ||
        !errorText.includes(ASK_USER_MARKER)
      ) {
        continue;
      }

      const jsonStart = errorText.indexOf("{");
      if (jsonStart === -1) {
        continue;
      }

      try {
        const parsed = JSON.parse(errorText.slice(jsonStart));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.answers &&
          typeof parsed.answers === "object"
        ) {
          return parsed;
        }
      } catch {
        // Ignore malformed payloads and keep scanning older tool calls.
      }
    }
  }

  return null;
}
