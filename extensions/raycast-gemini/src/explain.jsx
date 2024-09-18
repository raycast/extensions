import useGemini from "./api/gemini";

export default function Explain(props) {
  return useGemini(props, { context: "Explain the following text as best as you can." });
}
