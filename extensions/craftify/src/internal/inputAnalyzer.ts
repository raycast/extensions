export function analyzeUserInput(input: string): { text: string; isUrl: boolean; isYoutubeVideo: boolean } {
  const text = input.trim();
  const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i;
  const isUrl = urlPattern.test(text);
  // YouTube URL patterns (short and long)
  const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&\S*)?$/i;
  const isYoutubeVideo = youtubePattern.test(text);
  return { text, isUrl, isYoutubeVideo };
}
