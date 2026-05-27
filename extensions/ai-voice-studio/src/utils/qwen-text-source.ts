// Re-export from mimo-text-source rather than openai-text-source so that any
// future OpenAI-specific divergence does not silently leak into the Qwen
// commands. The three modules currently share an implementation; consolidate
// here into a provider-neutral module if a fourth provider lands.
export { getPreviewText, resolveReadingText, type ResolvedText, type TextSourceKind } from "./mimo-text-source";
