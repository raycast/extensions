import useLlama from "./api/llama3";

export default function Friendly(props) {
  return useLlama(props, {
    context: "Make the following text seem more friendly. ONLY return the modified text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
