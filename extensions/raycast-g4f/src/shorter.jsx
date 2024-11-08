import useGPT from "./api/gpt.jsx";

export default function Shorter(props) {
  return useGPT(props, {
    context:
      "Make the following text shorter while keeping the core idea. Use the same language as the original text. ONLY return the shortened text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
