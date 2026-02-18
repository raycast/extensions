import TextTransformCommand from "./lib/text-transform";

export default function Summarize() {
  return (
    <TextTransformCommand
      title="Summarize"
      systemPrompt="You are a summarization assistant. Provide a clear, concise summary of the provided text. Capture the key points, main arguments, and essential information. Use bullet points for clarity when appropriate. Keep the summary significantly shorter than the original."
    />
  );
}
