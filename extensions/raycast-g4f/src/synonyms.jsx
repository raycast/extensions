import useGPT from "./api/gpt";

export default function FindSynonyms(props) {
  return useGPT(props, {
    context:
      "Find a list of at most 15 synonyms for the given word, separated in bullet points, ordered by relevance. " +
      "Only return the synonyms, and add nothing else. " +
      "Keep the casing of the word the same. Your response should only return the BULLET POINTS of the synonyms.",
    allowPaste: true,
  });
}
