import usePerplexity from "./api/perplexity";

export default function Explain(props) {
  return usePerplexity(props, {
    context: "Explain the following text with simple terms. If it's a single word, provide a short definition.",
  });
}
