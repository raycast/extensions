import TextTransformCommand from "./lib/text-transform";

export default function ExplainCode() {
  return (
    <TextTransformCommand
      title="Explain Code"
      systemPrompt="You are a programming tutor. Explain the provided code step by step in clear, plain language. Cover what each section does, why it works that way, and any important patterns or concepts used. Use markdown formatting with code blocks where helpful."
    />
  );
}
