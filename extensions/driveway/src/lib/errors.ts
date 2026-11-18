// Node rejects a failed child process with its own text: "Command failed:
// /usr/bin/foo --flags" plus whatever the process wrote to stderr, and
// osascript adds script offsets and an OSStatus code on top. That belongs in
// the log, not in a toast, so anything shaped like it is dropped in favour of
// the caller's plain fallback. Code that can explain a failure in a sentence
// throws that sentence instead, and it is used as-is.
const PROCESS_OUTPUT = /^Command failed:|execution error:/i;

export function errorText(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  // stderr arrives with newlines in it, which a toast renders as one run-on
  // line, so collapse the whitespace before deciding anything.
  const text = error.message.replace(/\s+/g, " ").trim();
  if (!text || PROCESS_OUTPUT.test(text)) {
    console.error(error);
    return fallback;
  }

  return text;
}
