import useGPT from "./api/gpt.jsx";

export default function Paraphrase(props) {
  return useGPT(props, {
    context:
      "Paraphrase the following text. Make sure to keep the tone and meaning of the text the same, " +
      "and write in a natural style as far as possible. Try to keep your response at the same length of words as the original. " +
      "ONLY return the paraphrased text and nothing else.",
    useSelected: true,
    showFormText: "Text",
    allowPaste: true,
  });
}
