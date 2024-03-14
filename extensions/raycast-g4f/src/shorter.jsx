import useGPT from "./api/gpt";

export default function Shorter(props) {
  return useGPT(props, {
    context:
      "Make the following text shorter while keeping the core idea. ONLY return the shortened text and nothing else.",
    allowPaste: true,
  });
}
