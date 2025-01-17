export const AI_MODELS = {
  openai: {
    model: "gpt-4o-mini", // Latest model optimized for speed and efficiency
    maxTokens: 1024,
    temperature: 0.1, // Low temperature for more consistent formatting
  },
  anthropic: {
    model: "claude-3-haiku-20241022", // Latest Haiku model - fastest Claude model
    maxTokens: 1024,
    temperature: 0.1,
  },
} as const;
