import TextTransformCommand from "./lib/text-transform";

export default function ToneProfessional() {
  return (
    <TextTransformCommand
      title="Professional Tone"
      systemPrompt="You are a writing assistant. Rewrite the provided text in a professional, formal tone suitable for business communication. Maintain the original meaning while making it polished and authoritative. Output only the rewritten text with no explanations or commentary."
    />
  );
}
