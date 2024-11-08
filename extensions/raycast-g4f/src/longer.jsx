import useGPT from "./api/gpt.jsx";

export default function Longer(props) {
  return useGPT(props, {
    context:
      "Make the following text longer without providing any extra information than what's given. Use the same language as the original text. ONLY return the elongated text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
