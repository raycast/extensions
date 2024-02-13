import usePerplexity from "./api/perplexity";

export default function Compose(props) {
  return usePerplexity(props, {
    context:
      "I received the following email or message (see section 'Text'). Write a polite and friendly response, according to my comment, that could be sent to the recipient. Keep the tone of voice the same. NEVER mention my comment in your response.",
    useSelected: true,
    allowPaste: true,
  });
}
