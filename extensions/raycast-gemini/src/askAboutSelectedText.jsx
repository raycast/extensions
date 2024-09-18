import useGemini from "./api/gemini";

export default function AskAI(props) {
  return useGemini(props, { allowPaste: true, useSelected: true });
}
