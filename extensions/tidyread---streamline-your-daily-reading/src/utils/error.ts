export const NO_FEEDS = "No feeds to generate digest";
export const NO_API_KEY = "No API key found";

export function matchError(error: Error, message: string) {
  return error.message.includes(message);
}
