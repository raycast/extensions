import useLlama from "./api/llama3";

export default function Explain(props) {
  return useLlama(props, {
    context: "Explain the following text as best as you can.",
    showFormText: "Text",
    useSelected: true,
  });
}
