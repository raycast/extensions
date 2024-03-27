import useGPT from "./api/gpt";

export default function Longer(props) {
  return useGPT(props, {
    context:
      "Make the following text longer without providing any extra information than what's given. ONLY return the elongated text and nothing else.",
    allowPaste: true,
  });
}
