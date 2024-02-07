import usePerplexity from "./api/perplexity";

export default function Summarize(props) {
  return usePerplexity(props, {
    context:
      "Extract all facts from the following text and summarize it in all relevant aspects. Start with a 1-liner summary. Start every bullet point with a good machting emoji",
  });
}
