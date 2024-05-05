import useLlama from "./api/llama3";

export default function FindSynonyms(props) {
  const prompt =
    "Find a list of at most 15 synonyms for the given word/phrase, separated in bullet points, ordered by relevance. " +
    "Only return the synonyms, and add nothing else. " +
    "Keep the casing of the word/phrase the same. Your response should only return the BULLET POINTS of the synonyms.\n";

  return useLlama(props, { context: prompt, showFormText: "Word/phrase", allowPaste: true });
}
