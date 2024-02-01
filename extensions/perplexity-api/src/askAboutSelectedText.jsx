import usePerplexity from "./api/perplexity";

export default function AskAI(props) {
  return usePerplexity(props, { allowPaste: true, useSelected: true });
}
