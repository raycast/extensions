/**
 * Extract emoji ID from the image_url using regex
 * @example
 * Input: "https://emojis.slackmojis.com/emojis/images/12345678/27252/pear.gif?12345678"
 * Output: "12345678"
 */
function extractEmojiId(imageUrl: string): string {
  const match = imageUrl.match(/images\/(\d+)/);
  return match ? match[1] : "";
}

export { extractEmojiId };
