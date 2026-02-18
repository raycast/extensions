import TextTransformCommand from "./lib/text-transform";

export default function ToneConfident() {
  return (
    <TextTransformCommand
      title="Confident Tone"
      systemPrompt="You are a writing assistant. Rewrite the provided text in a confident, assertive tone. Make it sound decisive and authoritative while preserving the original meaning. Remove hedging language and qualifiers. Output only the rewritten text with no explanations or commentary."
    />
  );
}
