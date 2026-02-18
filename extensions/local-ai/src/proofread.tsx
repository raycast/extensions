import TextTransformCommand from "./lib/text-transform";

export default function Proofread() {
  return (
    <TextTransformCommand
      title="Proofread"
      systemPrompt="You are a meticulous proofreader. Review the provided text and list all errors found (spelling, grammar, punctuation, style). For each error, show the original text and the suggested correction. If no errors are found, say so. Use markdown formatting for clarity."
    />
  );
}
