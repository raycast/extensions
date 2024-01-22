import useGemini from "./api/gemini";

export default function FindSynonym(props) {
  return useGemini(props, {
    context:
      "Find one synonym for the given word. Only return that the synonym, and add nothing else. Keep the casing of the word the same. Your response should only have ONE WORD",
    allowPaste: true,
  });
}
