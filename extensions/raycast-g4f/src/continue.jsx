import useGPT from "./api/gpt.jsx";

export default function Continue(props) {
  return useGPT(props, {
    context:
      "Generate a natural continuation of the following text. Try to keep your continuation consistent with the original. " +
      "ONLY return the continued text and nothing else.",
    useSelected: true,
    showFormText: "Text to continue",
    allowPaste: true,
  });
}
