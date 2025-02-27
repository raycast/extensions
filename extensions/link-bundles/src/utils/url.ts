export const decodeUrlSafely = (url: string): string => {
  try {
    // Check if the URL is already decoded by attempting to decode it twice
    const decodedOnce = decodeURIComponent(url);
    const decodedTwice = decodeURIComponent(decodedOnce);

    // If decoding twice gives the same result, the URL was already decoded
    return decodedOnce === decodedTwice ? decodedOnce : decodedTwice;
  } catch (error) {
    // If decoding fails, return the original URL
    console.warn(`Failed to decode URL: ${url}`, error);
    return url;
  }
};
