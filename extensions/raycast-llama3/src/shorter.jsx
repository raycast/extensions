import useLlama from "./api/llama3";

export default function Shorter(props) {
  return useLlama(props, {
    context:
      "Make the following text shorter while keeping the core idea. ONLY return the shortened text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
