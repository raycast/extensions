import useGPT from "./api/gpt";

export default function FindSynonyms(props) {
  const prompt =
    "Find a list of at most 15 synonyms for the given word/phrase, separated in bullet points, ordered by relevance. " +
    "Only return the synonyms, and add nothing else. " +
    "Keep the casing of the word/phrase the same. Your response should only return the BULLET POINTS of the synonyms.\n";

  if (props.arguments.phrase) {
    let phrase = props.arguments.phrase;
    return useGPT(
      { ...props, arguments: { query: prompt + phrase } },
      {
        allowPaste: true,
      }
    );
  } else {
    return useGPT(props, { context: prompt, allowPaste: true });
  }
}
