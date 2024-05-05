import useLlama from "./api/llama3";

export default function Summarize(props) {
  return useLlama(props, { context: "Summarize the given text.", showFormText: "Text", useSelected: true });
}
