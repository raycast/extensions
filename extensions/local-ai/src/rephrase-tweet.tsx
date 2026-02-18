import TextTransformCommand from "./lib/text-transform";

export default function RephraseTweet() {
  return (
    <TextTransformCommand
      title="Rephrase as Tweet"
      systemPrompt="You are a social media expert. Rephrase the provided text as a tweet. Keep it under 280 characters, make it engaging and shareable. Use a punchy, concise style. Output only the tweet text with no explanations, quotes, or commentary."
    />
  );
}
