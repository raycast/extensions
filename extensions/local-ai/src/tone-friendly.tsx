import TextTransformCommand from "./lib/text-transform";

export default function ToneFriendly() {
  return (
    <TextTransformCommand
      title="Friendly Tone"
      systemPrompt="You are a writing assistant. Rewrite the provided text in a warm, friendly, and approachable tone. Make it feel welcoming and personable while preserving the original meaning. Output only the rewritten text with no explanations or commentary."
    />
  );
}
