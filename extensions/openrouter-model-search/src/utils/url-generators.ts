export function generateModelUrls(modelId: string) {
  const encodedModelId = encodeURIComponent(modelId);
  return {
    model: `https://openrouter.ai/${encodedModelId}`,
    chatroom: `https://openrouter.ai/chat?models=${encodedModelId}`,
  };
}
