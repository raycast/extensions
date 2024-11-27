import useGemini from "./api/gemini";

export default function Summarize(props) {
  return useGemini(props, { context: "Summarize the given text." });
}
