import usePerplexity from "./api/perplexity";

export default function Casual(props) {
  return usePerplexity(props, {
    context:
      "Act as a content writer and editor. Rewrite the text to ensure: Use casual and friendly tone of voice, use active voice, keep sentences short, keep grammatical person, correct spelling and grammar, keep meaning unchanged, keep legth retained.",
    allowPaste: true,
  });
}
