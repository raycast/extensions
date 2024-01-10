import useGemini from "./api/gemini";

export default function Summarize(props) {
  return useGemini(props, "Summarize the given text.");
}
