import useLlama from "./api/llama3";

export default function Continue(props) {
  return useLlama(props, {
    context:
      "Generate a natural continuation of the given text. Try to keep your continuation consistent with the original. " +
      "ONLY return the continued text and nothing else.",
    useSelected: true,
    showFormText: "Text to continue",
    allowPaste: true,
  });
}
