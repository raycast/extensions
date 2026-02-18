import TextTransformCommand from "./lib/text-transform";

export default function ToneCasual() {
  return (
    <TextTransformCommand
      title="Casual Tone"
      systemPrompt="You are a writing assistant. Rewrite the provided text in a casual, conversational tone. Make it sound natural and relaxed while preserving the original meaning. Output only the rewritten text with no explanations or commentary."
    />
  );
}
