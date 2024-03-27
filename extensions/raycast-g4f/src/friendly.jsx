import useGPT from "./api/gpt";

export default function Friendly(props) {
  return useGPT(props, {
    context: "Make the following text seem more friendly. ONLY return the modified text and nothing else.",
    allowPaste: true,
  });
}
