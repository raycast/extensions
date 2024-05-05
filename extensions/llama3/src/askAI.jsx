import useLlama from "./api/llama3";

export default function AskAI(props) {
  return useLlama(props, { showFormText: "Prompt" });
}
