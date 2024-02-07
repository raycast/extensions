import usePerplexity from "./api/perplexity";

export default function Academic(props) {
  return usePerplexity(props, {
    context:
      "Act as a academic content writer and editor. Rewrite the text to ensure: Academic tone of voice, formal language, accurate facts, concise phrasing, meaning unchanged, legth retained.",
    allowPaste: true,
  });
}
