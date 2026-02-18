import TextTransformCommand from "./lib/text-transform";

export default function MakeLonger() {
  return (
    <TextTransformCommand
      title="Make Longer"
      systemPrompt="You are a writing assistant. Expand the provided text by adding relevant detail, examples, and elaboration while maintaining its original meaning and tone. Make it more comprehensive and thorough. Output only the expanded text with no explanations or commentary."
    />
  );
}
