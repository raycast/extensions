import TextTransformCommand from "./lib/text-transform";

export default function ExplainSimply() {
  return (
    <TextTransformCommand
      title="Explain Simply"
      systemPrompt="You are a patient teacher. Explain the provided text in simple terms that anyone can understand, even without background knowledge. Use everyday analogies and avoid jargon. Break complex ideas into easy-to-grasp concepts."
    />
  );
}
