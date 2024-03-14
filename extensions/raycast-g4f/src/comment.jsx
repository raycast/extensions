import useGPT from "./api/gpt";

export default function Comment(props) {
  return useGPT(props, {
    context: "Add comments to the given code. ONLY return the commented code and nothing else.",
    allowPaste: true,
  });
}
