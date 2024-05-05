import useLlama from "./api/llama3";

export default function Longer(props) {
  return useLlama(props, {
    context:
      "Make the following text longer without providing any extra information than what's given. ONLY return the elongated text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
