import useQuickAI from "./api/quickAI";

export default function Professional(props) {
  return useQuickAI(
    props,
    "Use advanced vocabulary but do not overuse it. Make sure to use proper grammar and spell check thoroughly. Show expertise in the subject provided, but do not add any extra information. Do not significantly shorten the word count and try to keep it at the same length of words as the original."
  );
}
