// JSONL chunk-based parsing utilities — regex patterns
const RE_INPUT_TOKENS_SRC = /"input_tokens"\s*:\s*(\d+)/g;
const RE_OUTPUT_TOKENS_SRC = /"output_tokens"\s*:\s*(\d+)/g;
const RE_CACHE_READ_SRC = /"cache_read_input_tokens"\s*:\s*(\d+)/g;
const RE_CACHE_CREATION_SRC = /"cache_creation_input_tokens"\s*:\s*(\d+)/g;
const RE_MODEL_SRC = /"model"\s*:\s*"([^"]+)"/g;
const RE_TYPE_ASSISTANT_SRC = /"type"\s*:\s*"assistant"/g;
const RE_TYPE_USER_SRC = /"type"\s*:\s*"(?:user|human)"/g;

// Non-global regex (no concurrency issue)
export const RE_GIT_BRANCH = /"gitBranch"\s*:\s*"([^"]+)"/;

// Factory functions that return fresh regex instances per call
export function RE_INPUT_TOKENS() {
  return new RegExp(RE_INPUT_TOKENS_SRC.source, "g");
}
export function RE_OUTPUT_TOKENS() {
  return new RegExp(RE_OUTPUT_TOKENS_SRC.source, "g");
}
export function RE_CACHE_READ() {
  return new RegExp(RE_CACHE_READ_SRC.source, "g");
}
export function RE_CACHE_CREATION() {
  return new RegExp(RE_CACHE_CREATION_SRC.source, "g");
}
export function RE_MODEL() {
  return new RegExp(RE_MODEL_SRC.source, "g");
}
export function RE_TYPE_ASSISTANT() {
  return new RegExp(RE_TYPE_ASSISTANT_SRC.source, "g");
}
export function RE_TYPE_USER() {
  return new RegExp(RE_TYPE_USER_SRC.source, "g");
}

export function sumAllMatches(text: string, re: RegExp): number {
  let total = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    total += parseInt(m[1], 10);
  }
  return total;
}

export function countMatches(text: string, re: RegExp): number {
  let count = 0;
  while (re.exec(text) !== null) count++;
  return count;
}

export function lastMatch(text: string, re: RegExp): string | undefined {
  let last: string | undefined;
  let m;
  while ((m = re.exec(text)) !== null) last = m[1];
  return last;
}
