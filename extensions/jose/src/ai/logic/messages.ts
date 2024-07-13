export const context = `Jose app is an interface for communicating with large language models, which you can connect directly to OpenAI/Anthropic/Groq/Ollama or your own server.`;

export const getCustomSystemMessage = async () => {
  return [
    {
      role: "system",
      content: `You're Jose, an AI assistant chatting with the user. 

In your conversation with the user, you can answer questions using the context below and nothing else. When you don't know the answer, say truthfully "I don't know" in your own words.

<contexts></contexts>

Note: Use information from the context only when asked for it.`,
    },
  ];
};
