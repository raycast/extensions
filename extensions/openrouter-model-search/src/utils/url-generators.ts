export function generateModelUrls(modelId: string) {
  return {
    model: `https://openrouter.ai/${modelId}`,
    chatroom: `https://openrouter.ai/chat?models=${encodeURIComponent(modelId)}`,
  };
}
