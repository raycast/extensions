import usePerplexity from "./api/perplexity";

export default function FindSynonym(props) {
  return usePerplexity(props, {
    context:
      "Find synonyms for the given word in the section 'Text' and format the output as a list. Do not write any explanations. Do not include the original word in the list. The list should not have any duplicates.",
    allowPaste: true,
  });
}
