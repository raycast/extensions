import usePerplexity from "./api/perplexity";

export default function Grammar(props) {
  return usePerplexity(props, {
    context:
      "Act as a spelling corrector and improver. Rewrite the following text with corrected spelling, grammar and punctuation. Only return the fixed text",
    allowPaste: true,
  });
}
