import useGPT from "./api/gpt";

export default function Explain(props) {
  return useGPT(props, { context: "Explain the following text as best as you can." });
}
