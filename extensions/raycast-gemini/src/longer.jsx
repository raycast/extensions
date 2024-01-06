import useGemini from "./api/gemini";

export default function Longer(props) {
  return useGemini(props, "Make the following text longer without providing any extra information than what's given.");
}
