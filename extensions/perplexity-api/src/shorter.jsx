import usePerplexity from "./api/perplexity";

export default function Shorter(props) {
  return usePerplexity(props, {
    context:
      "Act as a content writer. Make the text shorter with the following instructions: Use the same style and tone of voice, reduce repetition, keep key information.",
    allowPaste: true,
  });
}
