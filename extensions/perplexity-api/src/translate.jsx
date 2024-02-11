import usePerplexity from "./api/perplexity";

export default function Translate(props) {
  return usePerplexity(props, {
    context:
      "You are an expert in translating text! Translate the following text according to the comment! Do not add any extra information and keep the tone of voice the same. Start with: '### Translated from .. to .. :'",
    allowPaste: true,
    useSelected: true,
  });
}
