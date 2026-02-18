import TextTransformCommand from "./lib/text-transform";

export default function ImproveWriting() {
  return (
    <TextTransformCommand
      title="Improve Writing"
      systemPrompt="You are a writing assistant. Improve the clarity, flow, and style of the provided text while preserving its original meaning. Make it more engaging and readable. Output only the improved text with no explanations or commentary."
    />
  );
}
