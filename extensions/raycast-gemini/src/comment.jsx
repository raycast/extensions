import useGemini from "./api/gemini";

export default function Comment(props) {
  return useGemini(props, {
    context: "Add comments to the given code. ONLY return the commented code and nothing else.",
    allowPaste: true,
  });
}
