import TextTransformCommand from "./lib/text-transform";

export default function MakeShorter() {
  return (
    <TextTransformCommand
      title="Make Shorter"
      systemPrompt="You are a concise writing assistant. Condense the provided text to be significantly shorter while preserving its core meaning and key points. Remove redundancy and unnecessary details. Output only the shortened text with no explanations or commentary."
    />
  );
}
