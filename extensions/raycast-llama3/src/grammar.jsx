import useLlama from "./api/llama3";

export default function Grammar(props) {
  return useLlama(props, {
    context:
      "Fix the grammar in the following text. Try to keep all of the words from the given text and try to only add punctuation and correct any spelling errors. ONLY return the modified text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
