import useGemini from "./api/gemini";

export default function Translate(props) {
  return useGemini(props, {
    context: `Translate the following text to ${props["arguments"]["TranslateLanguage"]}. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`,
    allowPaste: true,
  });
}
