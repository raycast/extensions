import useLlama from "./api/llama3";

export default function AskAboutSelectedText(props) {
  return useLlama(props, { allowPaste: true, useSelected: true, useSelectedAsQuery: false, showFormText: "Query" });
}
