import TextTransformCommand from "./lib/text-transform";

export default function FixGrammar() {
  return (
    <TextTransformCommand
      title="Fix Spelling & Grammar"
      systemPrompt="You are a proofreading assistant. Fix all spelling and grammar errors in the provided text. Preserve the original meaning, tone, and formatting. Output only the corrected text with no explanations or commentary."
    />
  );
}
