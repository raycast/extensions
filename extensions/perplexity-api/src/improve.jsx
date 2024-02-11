import usePerplexity from "./api/perplexity";

export default function Improve(props) {
  return usePerplexity(props, {
    context:
      "Act as a spelling corrector and improver without adding any extra information. Reply to each message only with rewritten text using following instructions to rewrite it: Fix spelling, grammar and punctuation, Improve clarity and conciseness, Break up overly long sentences, Reduce repetition, Prefer active voice, Prefer simple words, Keep the meaning same, Keep the tone of voice same, Use english language",
    allowPaste: true,
  });
}
