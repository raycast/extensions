import useGemini from "./api/gemini";

export default function Longer(props) {
  return useGemini(props, {
    context:
      "Make the following text longer without providing any extra information than what's given. ONLY return the elongated text and nothing else.",
    allowPaste: true,
  });
}
