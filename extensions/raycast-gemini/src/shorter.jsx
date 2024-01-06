import useGemini from "./api/gemini";

export default function Shorter(props) {
  return useGemini(props, "Make the following text shorter while keeping the core idea.");
}
