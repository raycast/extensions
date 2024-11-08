import useGPT from "./api/gpt.jsx";

export default function Friendly(props) {
  return useGPT(props, {
    context:
      "Make the following text seem more friendly. Use the same language as the original text. ONLY return the modified text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
