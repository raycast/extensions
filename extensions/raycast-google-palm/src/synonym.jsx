import useQuickAI from "./api/quickAI";

export default function FindSynonym(props) {
  return useQuickAI(
    props,
    "Find one synonym for the given word. Do not write any explanations. Only return that the synonym, and add nothing else. Keep the casing of the word the same. Your response should only have ONE WORD",
    [
      ["Default", "Preset"],
      ["model", "algorithm"],
      ["accident", "mishap"],
      ["else", "otherwise"],
    ]
  );
}
