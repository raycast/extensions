import useGemini from "./api/gemini";

export default function Professional(props) {
  return useGemini(props, {
    context:
      "In the following text, change it to use advanced vocabulary but do not overuse it. Make sure to use proper grammar and spell check thoroughly. Show expertise in the subject provided, but do not add any extra information. Try to keep your response at the same length of words as the original. ONLY return the modified text and nothing else.",
    allowPaste: true,
  });
}
