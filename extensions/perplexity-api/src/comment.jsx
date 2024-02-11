import usePerplexity from "./api/perplexity";

export default function Comment(props) {
  return usePerplexity(props, {
    context:
      "Act as a software engineer with deep understanding of any programming language and it's documentation. Start with an high-level overview and then explain how the code works step by step in a list. Be concise with a casual tone of voice and write it as documentation for others.",
    allowPaste: true,
  });
}
