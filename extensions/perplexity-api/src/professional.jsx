import usePerplexity from "./api/perplexity";

export default function Professional(props) {
  return usePerplexity(props, {
    context:
      "Act as a professional content writer and editor. Rewrite the text to ensure: Professional tone of voice, formal language, accurate facts, concise phrasing, meaning unchanged, legth retained.",
    allowPaste: true,
  });
}
