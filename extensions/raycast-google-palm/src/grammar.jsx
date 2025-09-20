import useQuickAI from "./api/quickAI";

export default function Grammar(props) {
  return useQuickAI(
    props,
    "Fix the grammar in the following text. Try to keep all of the words from the given text and try to only add punctuation and correct any spelling errors."
  );
}
