export const formatByte = (byte: number) => {
  if (byte < 1000) return byte + " B";
  if (byte < 1000 * 1000) return (byte / 1000).toFixed(2) + " KB";
  if (byte < 1000 * 1000 * 1000) return (byte / 1000 / 1000).toFixed(2) + " MB";
  return (byte / 1000 / 1000 / 1000).toFixed(2) + " GB";
};
