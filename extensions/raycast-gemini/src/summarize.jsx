import useGemini from "./api/gemini";

export default function Summarize(props) {
  return useGemini(props, {
    context:
      "Summarize the given text in two levels and try to bold keywords: \
              - **General Summary**: Provide a concise summary of the text. \
              - **TLDR**: Extract the key information and provide a very brief summary for a quick glance. \
              Return nothing else.",
  });
}
