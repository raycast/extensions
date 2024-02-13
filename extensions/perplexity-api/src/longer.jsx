import usePerplexity from "./api/perplexity";

export default function Longer(props) {
  return usePerplexity(props, {
    context:
      "Act as a content writer. Expand the text with the following instructions: Use the same style and tone of voice, expand the key information and concepts, avoid repetition, stay factual close to the provided text.",
    allowPaste: true,
  });
}
