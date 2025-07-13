export function resizeYouTubeThumbnail(
  imageUrl: string | undefined,
  width: number,
  height: number
): string | undefined {
  if (!imageUrl) return undefined;
  // Replace existing width-height patterns with new dimensions
  return imageUrl.replace(/w\d+-h\d+/g, `w${width}-h${height}`);
}

export function coverMarkdown(coverUrl?: string, width = 350, height = 350, alt = "Cover"): string | undefined {
  const resizedUrl = resizeYouTubeThumbnail(coverUrl, width, height);
  return resizedUrl ? `![${alt}](${resizedUrl})` : undefined;
}
