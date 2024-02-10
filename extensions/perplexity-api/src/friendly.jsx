import usePerplexity from "./api/perplexity";

export default function Friendly(props) {
  return usePerplexity(props, {
    context:
      "Act as a content writer and editor. Rewrite the text to ensure: Friendly and optimistic tone of voice, correct spelling, grammar, and punctuation, meaning unchanged, legth retained.",
    allowPaste: true,
  });
}
