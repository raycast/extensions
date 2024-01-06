import useGemini from "./api/gemini";

export default function Comment(props) {
  return useGemini(props, "Add comments to the given code.");
}
