import { validatePostLength } from "../v2/lib/post_text";
export function requirePostId(postId: string): string {
  const normalizedPostId = postId.trim();
  if (!/^\d{1,19}$/.test(normalizedPostId)) {
    throw new Error("A valid numeric X post ID is required.");
  }
  return normalizedPostId;
}

export function requirePostText(text: string): string {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Post text cannot be empty.");
  validatePostLength(normalizedText);
  return normalizedText;
}
